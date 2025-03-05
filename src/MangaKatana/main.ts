import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
  ContentRating,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  Extension,
  MangaProviding,
  PagedResults,
  PaperbackInterceptor,
  Request,
  Response,
  SearchFilter,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SourceManga,
  TagSection,
  URL,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { URLBuilder } from "../utils/url-builder/base";
import { genreOptions } from "./genreOptions";
import { genres } from "./genres";

const DOMAIN_NAME = "https://mangakatana.com/";

// Define CloudflareError class for handling Cloudflare protection
class CloudflareError extends Error {
  constructor(request: { url: string; method: string }) {
    super("Cloudflare protection detected");
    this.name = "CloudflareError";
    this.request = request;
  }

  request: { url: string; method: string };
}

// Should match the capabilities which you defined in pbconfig.ts
type MangaKatanaImplementation = Extension &
  DiscoverSectionProviding &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding;

// Intercepts all the requests and responses and allows you to make changes to them
class MangaKatanaInterceptor extends PaperbackInterceptor {
  override async interceptRequest(request: Request): Promise<Request> {
    request.headers = {
      ...request.headers,
      referer: DOMAIN_NAME,
      origin: DOMAIN_NAME,
      "user-agent": await Application.getDefaultUserAgent(),
    };

    return request;
  }

  override async interceptResponse(
    request: Request,
    response: Response,
    data: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    return data;
  }
}

// Main extension class
export class MangaKatanaExtension implements MangaKatanaImplementation {
  // Implementation of the main rate limiter
  mainRateLimiter = new BasicRateLimiter("main", {
    numberOfRequests: 15,
    bufferInterval: 10,
    ignoreImages: true,
  });

  // Implementation of the main interceptor
  mangaKatanaInterceptor = new MangaKatanaInterceptor("main");

  // Method from the Extension interface which we implement, initializes the rate limiter, interceptor, discover sections and search filters
  async initialise(): Promise<void> {
    this.mainRateLimiter.registerInterceptor();
    this.mangaKatanaInterceptor.registerInterceptor();
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    const get_Hot_Updates_Section: DiscoverSection = {
      id: "hot-updates",
      title: "Hot Updates",
      type: DiscoverSectionType.featured,
    };

    const get_Latest_Updates_Section: DiscoverSection = {
      id: "latest-updates",
      title: "Latest Updates",
      type: DiscoverSectionType.simpleCarousel,
    };

    const get_New_Manga_Section: DiscoverSection = {
      id: "new-manga",
      title: "New Manga",
      type: DiscoverSectionType.simpleCarousel,
    };

    const get_Genres_Section: DiscoverSection = {
      id: "genres",
      title: "Genres",
      type: DiscoverSectionType.genres,
    };

    return [
      get_Hot_Updates_Section,
      get_Latest_Updates_Section,
      get_New_Manga_Section,
      get_Genres_Section,
    ];
  }

  // Populates both the discover sections
  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: Katana.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      case "hot-updates":
        return this.getHotUpdatesSectionItems();
      case "latest-updates":
        return this.getLatestUpdatesSectionItems(section, metadata);
      case "new-manga":
        return this.getNewMangaSectionItems(section, metadata);
      case "genres":
        return this.getGenresSectionItems();
      default:
        return { items: [] };
    }
  }

  // Populates the hot updates section
  async getHotUpdatesSectionItems(): Promise<
    PagedResults<DiscoverSectionItem>
  > {
    const request = {
      url: new URLBuilder(DOMAIN_NAME).build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);

    const items: DiscoverSectionItem[] = [];

    // Extract Hot Updates from the #hot_update section
    $("#hot_update .item").each((_, element) => {
      const unit = $(element);
      const titleLink = unit.find("h3.title a").first();
      const title = titleLink.text().trim();
      const href = titleLink.attr("href") || "";
      const mangaId = href.split("/").pop() || "";
      const image = unit.find(".wrap_img img").attr("src") || "";
      const chapter = unit.find(".chapter a").first().text().trim();

      if (mangaId && title && image) {
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            subtitle: chapter,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // No pagination available, so no next page
    return {
      items: items,
      metadata: undefined,
    };
  }

  // Populates the latest updates section
  async getLatestUpdatesSectionItems(
    section: DiscoverSection,
    metadata: Katana.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = (metadata as { page?: number } | undefined)?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    const request = {
      url: new URLBuilder(DOMAIN_NAME)
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);

    const items: DiscoverSectionItem[] = [];

    $("#book_list .item").each((_, element) => {
      const unit = $(element);
      const titleLink = unit.find("h3.title a").first();
      const title = titleLink.text().trim();
      const href = titleLink.attr("href") || "";
      const mangaId = href.split("/").pop() || ""; // Extract manga ID from URL path
      const image = unit.find(".wrap_img img").attr("src") || "";

      // Extract latest chapter info
      const chapters = unit.find(".chapters .chapter a");
      const latestChapter = chapters.first().text().trim();
      const subtitleSpan = unit
        .find("h3.title span")
        .text()
        .trim()
        .replace(/^-\s*/, "");
      const subtitle = latestChapter || subtitleSpan;

      if (mangaId && title && image && !collectedIds.includes(mangaId)) {
        collectedIds.push(mangaId);
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            subtitle: subtitle,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // Check for next page
    const nextPageHref = $("a.next.page-numbers").attr("href");
    let nextPage: number | undefined;
    if (nextPageHref) {
      const pageMatch = nextPageHref.match(/page\/(\d+)/);
      if (pageMatch) {
        nextPage = parseInt(pageMatch[1], 10);
      } else {
        nextPage = page + 1;
      }
    }

    return {
      items: items,
      metadata: nextPage ? { page: nextPage } : undefined,
    };
  }

  // Populates the new manga section
  async getNewMangaSectionItems(
    section: DiscoverSection,
    metadata: Katana.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = (metadata as { page?: number } | undefined)?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    const request = {
      url: new URLBuilder(DOMAIN_NAME)
        .addPath("new-manga")
        .addQuery("page", String(page))
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $("#book_list .item").each((_, element) => {
      const unit = $(element);
      const titleLink = unit.find("h3.title a").first();
      const title = titleLink.text().trim();
      const href = titleLink.attr("href") || "";
      const mangaId = href.split("/").pop() || "";
      const image = unit.find(".wrap_img img").attr("src") || "";

      // Extract latest chapter info
      const chapters = unit.find(".chapters .chapter a");
      const latestChapter = chapters.first().text().trim();
      const subtitleSpan = unit
        .find("h3.title span")
        .text()
        .trim()
        .replace(/^-\s*/, "");
      const subtitle = latestChapter || subtitleSpan;

      if (mangaId && title && image && !collectedIds.includes(mangaId)) {
        collectedIds.push(mangaId);
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            subtitle: subtitle,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // Check for next page
    const nextPageHref = $("a.next.page-numbers").attr("href");
    let nextPage: number | undefined;
    if (nextPageHref) {
      const pageMatch = nextPageHref.match(/page\/(\d+)/);
      if (pageMatch) {
        nextPage = parseInt(pageMatch[1], 10);
      } else {
        nextPage = page + 1;
      }
    }

    return {
      items: items,
      metadata: nextPage ? { page: nextPage } : undefined,
    };
  }

  // Populates the genres section
  async getGenresSectionItems(): Promise<PagedResults<DiscoverSectionItem>> {
    // We are using genres array from the imported file here
    return {
      items: genres.map((genre) => ({
        type: "genresCarouselItem",
        searchQuery: {
          title: "",
          filters: [{ id: "genres", value: { [genre.id]: "included" } }],
        },
        name: genre.name,
        // No need to pass metadata for genres as it's a static list
        metadata: undefined,
      })),
    };
  }

  async getCloudflareBypassRequestAsync(): Promise<Request> {
    return {
      url: `${DOMAIN_NAME}/`,
      method: "GET",
      headers: {
        referer: `${DOMAIN_NAME}/`,
        origin: `${DOMAIN_NAME}/`,
        "user-agent": await Application.getDefaultUserAgent(),
      },
    };
  }

  async fetchCheerio(request: Request): Promise<CheerioAPI> {
    const [response, data] = await Application.scheduleRequest(request);
    this.checkCloudflareStatus(response.status);
    return cheerio.load(Application.arrayBufferToUTF8String(data));
  }

  checkCloudflareStatus(status: number): void {
    if (status === 503 || status === 403) {
      throw new CloudflareError({ url: DOMAIN_NAME, method: "GET" });
    }
  }

  // Populate search filters
  async getSearchFilters(): Promise<SearchFilter[]> {
    const filters: SearchFilter[] = [];

    // Type filter dropdown
    filters.push({
      id: "genres",
      type: "multiselect",
      options: genreOptions,
      allowExclusion: true,
      value: {},
      title: "Genre Filter",
      allowEmptySelection: false,
      maximum: undefined,
    });

    return filters;
  }

  // Populates search
  // Add these properties to your class to track previous results
  private _lastValidResults: PagedResults<SearchResultItem> = {
    items: [],
    metadata: undefined,
  };
  private _lastValidQuery: string = "";

  async getSearchResults(
    query: SearchQuery,
    metadata?: { page?: number },
  ): Promise<PagedResults<SearchResultItem>> {
    const page = metadata?.page ?? 1;

    // Return empty results if search query is less than 3 characters
    if (query.title && query.title.length < 3) {
      console.log("Query too short, minimum 3 characters required");
      // If we have previous results and are backspacing, keep showing them
      if (
        this._lastValidQuery &&
        this._lastValidQuery.startsWith(query.title) &&
        this._lastValidResults.items.length > 0
      ) {
        return this._lastValidResults;
      }
      return { items: [], metadata: undefined };
    }

    const searchFilters = await this.getSearchFilters();
    const genreFilter = searchFilters.find((filter) => filter.id === "genres");

    // Process genre filters
    const genres = query.filters?.find((filter) => filter.id === "genres")
      ?.value as Record<string, "included" | "excluded"> | undefined;
    const genreEntries = genres ? Object.entries(genres) : [];

    // Define type for genre options
    type GenreOption = { id: string; value: string };

    // Properly check if genreFilter has options property
    const typedGenreOptions =
      genreFilter && "options" in genreFilter
        ? (genreFilter.options as GenreOption[])
        : [];

    // Determine search type
    const genreOnlySearch = genreEntries.length > 0 && !query.title;
    let searchUrl: URLBuilder;

    if (genreOnlySearch) {
      // Genre-only search - build path with genre names
      searchUrl = new URLBuilder(DOMAIN_NAME).addPath("genre");

      genreEntries.forEach(([genreId, inclusion]) => {
        if (inclusion === "included") {
          const genreOption = typedGenreOptions.find(
            (option) => option.id === genreId,
          );
          if (genreOption) {
            const formattedGenre = genreOption.value
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
            searchUrl.addPath(formattedGenre);
          }
        }
      });

      searchUrl.addQuery("page", String(page));
    } else {
      // Regular search with optional filters
      searchUrl = new URLBuilder(DOMAIN_NAME);

      if (query.title) {
        // Title search
        searchUrl
          .addQuery("search", encodeURIComponent(query.title))
          .addQuery("search_by", "book_name")
          .addQuery("page", String(page));
      } else {
        // Default to latest manga
        searchUrl.addPath("page").addPath(page.toString());
      }

      // Add genre filters
      genreEntries.forEach(([genreId, inclusion]) => {
        const prefix = inclusion === "excluded" ? "-" : "";
        searchUrl.addQuery("genres[]", `${prefix}${genreId}`);
      });
    }

    const request = { url: searchUrl.build(), method: "GET" };
    let response: Response, data: ArrayBuffer;

    try {
      [response, data] = await Application.scheduleRequest(request);
      this.checkCloudflareStatus(response.status);

      // Parse search results from HTML
      const html = Application.arrayBufferToUTF8String(data);
      const $ = cheerio.load(html);

      // Process search results
      const results = this.processSearchResults($, response.url, page);

      // If results are empty and we're in the middle of typing (partial query)
      // AND we have previous results, return those instead
      if (
        results.items.length === 0 &&
        query.title &&
        this._lastValidQuery &&
        query.title.includes(this._lastValidQuery) &&
        this._lastValidResults.items.length > 0
      ) {
        // We're continuing to type from a previous valid query, but got no results
        // Return the previous results to maintain persistence during typing
        console.log("Using cached results for partial query");
        return this._lastValidResults;
      }

      // If we got valid results, update our cache
      if (results.items.length > 0) {
        this._lastValidResults = results;
        this._lastValidQuery = query.title || "";
      }

      return results;
    } catch (error) {
      console.error("Search request failed:", error);

      // On error, if we have a previous valid result and this is a partial query
      // related to the previous query, return the cached results
      if (
        query.title &&
        this._lastValidQuery &&
        query.title.includes(this._lastValidQuery) &&
        this._lastValidResults.items.length > 0
      ) {
        return this._lastValidResults;
      }

      return { items: [], metadata: undefined };
    }
  }

  // Modify processSearchResults to better handle partial results
  private processSearchResults(
    $: CheerioAPI,
    responseUrl: string,
    currentPage: number | undefined,
  ): PagedResults<SearchResultItem> {
    const finalUrl = new URL(responseUrl);
    const searchResults: SearchResultItem[] = [];

    // Handle direct manga redirect (exact match)
    if (finalUrl.pathname.startsWith("/manga/")) {
      const mangaId = finalUrl.pathname.split("/manga/")[1].split("/")[0];
      const title = $("h1.heading").text().trim();
      const image = $(".cover img").attr("src") || "";
      const latestChapter = $(".update_time").first().text().trim();

      if (title && mangaId) {
        searchResults.push({
          mangaId,
          title,
          imageUrl: image,
          subtitle: latestChapter,
        });
      }
    }
    // First check search dropdown results if present
    else if ($("#search_rs .item").length > 0) {
      $("#search_rs .item").each((_, element) => {
        const unit = $(element);
        const titleLink = unit.find("a.title").first();
        const title = titleLink.text().trim();
        const href = titleLink.attr("href") || "";
        const mangaId = href.split("/").pop() || "";
        const image = unit.find(".wrap_img img").attr("src") || "";
        const latestChapter = unit.find(".chapter a").first().text().trim();

        if (mangaId && title) {
          searchResults.push({
            mangaId,
            title,
            imageUrl: image,
            subtitle: latestChapter,
          });
        }
      });
    }
    // Handle standard search page results
    else {
      $("#book_list .item").each((_, element) => {
        const unit = $(element);
        const titleLink = unit.find("h3.title a").first();
        const title = titleLink.text().trim();
        const href = titleLink.attr("href") || "";
        const mangaId = href.split("/").pop() || "";
        const image = unit.find(".wrap_img img").attr("src") || "";
        const latestChapter = unit.find(".chapter a").first().text().trim();

        if (mangaId && title) {
          searchResults.push({
            mangaId,
            title,
            imageUrl: image,
            subtitle: latestChapter,
          });
        }
      });
    }

    // Handle pagination
    let nextPage: number | undefined;
    const nextPageLink = $("a.next.page-numbers").attr("href");
    if (nextPageLink) {
      const pageMatch = nextPageLink.match(/(?:page\/|page=)(\d+)/);
      nextPage = pageMatch
        ? parseInt(pageMatch[1], 10)
        : (currentPage ?? 1) + 1;
    }

    return {
      items: searchResults,
      metadata: nextPage ? { page: nextPage } : undefined,
    };
  }

  // Populates the chapter list
  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const request = {
      url: new URLBuilder(DOMAIN_NAME)
        .addPath("manga")
        .addPath(sourceManga.mangaId)
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);

    const chapters: Chapter[] = [];

    $(".chapters table.uk-table tbody tr").each((_, element) => {
      const row = $(element);
      const chapterLink = row.find(".chapter a");
      const chapterPath = chapterLink.attr("href") || "";
      const chapterId = chapterPath.split("/").pop() || "";
      const rawChapterText = chapterLink.text().trim();

      // Extract chapter number and subtitle using regex
      const chapterMatch = rawChapterText.match(
        /Chapter\s+([\d.]+)(?:\s*-\s*(.*))?/i,
      );
      const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;
      const chapterSubtitle = chapterMatch?.[2]?.trim() || "";

      // Format title: Use subtitle if available, otherwise blank
      const formattedTitle = chapterSubtitle;

      // Parse publish date
      const rawDate = row.find(".update_time").text().trim();
      const [month, day, year] = rawDate.split("-");
      const publishDate = new Date(`${month} ${day}, ${year}`);

      chapters.push({
        chapterId: chapterId,
        title: formattedTitle, // Will be empty if no subtitle
        sourceManga,
        chapNum: chapterNumber,
        publishDate: publishDate,
        langCode: "en",
      });
    });

    return chapters.reverse();
  }

  // Populates a chapter with images
  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const url = new URLBuilder(DOMAIN_NAME)
      .addPath("manga")
      .addPath(chapter.sourceManga.mangaId)
      .addPath(chapter.chapterId)
      .build();

    const request = {
      url: url,
      method: "GET",
      headers: {
        referer: DOMAIN_NAME,
        origin: DOMAIN_NAME,
        "user-agent": await Application.getDefaultUserAgent(),
      },
    };

    try {
      const [response, data] = await Application.scheduleRequest(request);
      if (response.status !== 200) {
        throw new Error(
          `Failed to fetch chapter data: HTTP ${response.status}`,
        );
      }

      const htmlStr = Application.arrayBufferToUTF8String(data);
      const $ = cheerio.load(htmlStr);

      let pages: string[] = [];

      // Extract JavaScript variables
      const scripts = $("script")
        .toArray()
        .filter(
          (script) =>
            $(script).text().includes("var ytaw") ||
            $(script).text().includes("var thzq"),
        )
        .map((script) => $(script).text())
        .join("");

      const ytawMatch = scripts.match(/var ytaw\s*=\s*\[([^\]]+)\]/);
      const thzqMatch = scripts.match(/var thzq\s*=\s*\[([^\]]+)\]/);

      const parseUrls = (matchStr: RegExpMatchArray | null) => {
        if (!matchStr) return [];
        return matchStr[1]
          .split(",")
          .map((url) => url.trim().replace(/['"]/g, ""))
          .filter((url) => url && !url.includes("about:blank"))
          .map((url) =>
            url.startsWith("http") ? url : `${DOMAIN_NAME}${url}`,
          ); // Ensure absolute URLs
      };

      pages = [...parseUrls(ytawMatch), ...parseUrls(thzqMatch)];

      // Fallback: Extract from DOM elements
      if (pages.length === 0) {
        $("#imgs .wrap_img img").each((_, img) => {
          let imageUrl = $(img).attr("data-src") || $(img).attr("src");
          if (imageUrl) {
            imageUrl = imageUrl.startsWith("http")
              ? imageUrl
              : `${DOMAIN_NAME}${imageUrl}`;
            pages.push(imageUrl);
          }
        });
      }

      // Debugging Log
      console.log(`Extracted pages: ${JSON.stringify(pages)}`);

      if (pages.length === 0) {
        throw new Error("No valid image URLs found");
      }

      return {
        id: chapter.chapterId, // Return only the chapter ID, not the full URL
        mangaId: chapter.sourceManga.mangaId,
        pages: pages,
      };
    } catch (error) {
      console.error(
        `Failed to load chapter details: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        `Failed to load chapter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getMangaShareUrl(mangaId: string): string {
    return `${DOMAIN_NAME}/manga/${mangaId}`;
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request = {
      url: new URLBuilder(DOMAIN_NAME)
        .addPath("manga")
        .addPath(mangaId)
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);

    // Extract basic manga details
    const title = $("h1.heading").text().trim();
    const image = $(".cover img").attr("src") || "";
    const description = $(".summary p").text().trim();

    // Extract alternative titles
    const altTitles = $(".alt_name")
      .text()
      .trim()
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t);

    // Extract authors
    const authors: string[] = [];
    $('td:contains("Author")')
      .next()
      .find("a")
      .each((_, el) => {
        authors.push($(el).text().trim());
      });

    // Extract status
    let status = "UNKNOWN";
    const statusLabel = $('div.d-cell-small.label:contains("Status")');
    if (statusLabel.length) {
      const statusElement = statusLabel.siblings("div.value");
      if (statusElement.length) {
        const statusText = statusElement.text().trim().toLowerCase();
        if (statusText.includes("ongoing")) {
          status = "ONGOING";
        } else if (statusText.includes("completed")) {
          status = "COMPLETED";
        } else if (statusText.includes("hiatus")) {
          status = "HIATUS";
        } else if (statusText.includes("discontinued")) {
          status = "DISCONTINUED";
        }
      }
    }

    // Extract genres
    // Extract genres
    const genres: string[] = [];
    $('div.label:contains("Genres")').each((_, el) => {
      $(el)
        .next("div.value")
        .find("a")
        .each((_, genreEl) => {
          genres.push($(genreEl).text().trim());
        });
    });

    // Extract rating
    // let rating = 1;
    // const ratingText = $('.score').text().trim();
    // if (ratingText) {
    //     rating = parseFloat(ratingText) / 2; // Convert to 5-point scale
    // }

    // Build tag sections
    const tags: TagSection[] = [];
    if (genres.length > 0) {
      tags.push({
        id: "genres",
        title: "Genres",
        tags: genres.map((genre) => ({
          id: genre.toLowerCase().replace(/\s+/g, "_"),
          title: genre,
        })),
      });
    }

    // Determine content rating based on genres
    let contentRating = ContentRating.EVERYONE;
    const matureGenres = [
      "Adult",
      "Ecchi",
      "Erotica",
      "Sexual violence",
      "Gore",
    ];
    const adultGenres = ["Erotica", "Sexual violence"];

    if (genres.some((genre) => adultGenres.includes(genre))) {
      contentRating = ContentRating.ADULT;
    } else if (genres.some((genre) => matureGenres.includes(genre))) {
      contentRating = ContentRating.MATURE;
    }

    return {
      mangaId: mangaId,
      mangaInfo: {
        primaryTitle: title,
        secondaryTitles: altTitles,
        thumbnailUrl: image,
        synopsis: description,
        //rating: rating,
        contentRating: contentRating,
        status: status as "ONGOING" | "COMPLETED" | "UNKNOWN",
        tagGroups: tags,
        //authors: authors,
      },
    };
  }
}

function createDiscoverSectionItem(options: {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  type: "simpleCarouselItem";
}): DiscoverSectionItem {
  return {
    type: options.type,
    mangaId: options.id,
    imageUrl: options.image,
    title: options.title,
    subtitle: options.subtitle,
    metadata: undefined,
  };
}

export const MangaKatana = new MangaKatanaExtension();
