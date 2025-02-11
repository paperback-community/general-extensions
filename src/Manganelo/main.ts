import {
  Chapter,
  ChapterDetails,
  ChapterProviding,
  CloudflareError,
  ContentRating,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  Extension,
  MangaProviding,
  PagedResults,
  Request,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SourceManga,
  TagSection,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { URLBuilder } from "../utils/url-builder/base";
import { NeloInterceptor } from "./ManganeloInterceptor";

const baseUrl = "https://m.manganelo.com";

type MangaNeloImplementation = Extension &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding &
  DiscoverSectionProviding;

export class MangaNeloExtension implements MangaNeloImplementation {
  requestManager = new NeloInterceptor("main");

  async initialise(): Promise<void> {
    this.requestManager.registerInterceptor();

    Application.registerSearchFilter({
      id: "sortBy",
      type: "dropdown",
      options: [
        { id: "relevance", value: "Relevance" },
        { id: "latest", value: "Latest" },
        { id: "oldest", value: "Oldest" },
      ],
      value: "relevance",
      title: "Sort By Filter",
    });

    Application.registerSearchFilter({
      id: "genres",
      type: "multiselect",
      options: [
        { id: "2", value: "Action" },
        { id: "3", value: "Adult" },
        { id: "4", value: "Adventure" },
        { id: "6", value: "Comedy" },
        { id: "7", value: "Cooking" },
        { id: "9", value: "Doujinshi" },
        { id: "10", value: "Drama" },
        { id: "11", value: "Ecchi" },
        { id: "48", value: "Erotica" },
        { id: "12", value: "Fantasy" },
        { id: "13", value: "Gender bender" },
        { id: "14", value: "Harem" },
        { id: "15", value: "Historical" },
        { id: "16", value: "Horror" },
        { id: "45", value: "Isekai" },
        { id: "17", value: "Josei" },
        { id: "44", value: "Manhua" },
        { id: "43", value: "Manhwa" },
        { id: "19", value: "Martial arts" },
        { id: "20", value: "Mature" },
        { id: "21", value: "Mecha" },
        { id: "22", value: "Medical" },
        { id: "24", value: "Mystery" },
        { id: "25", value: "One shot" },
        { id: "47", value: "Pornographic" },
        { id: "26", value: "Psychological" },
        { id: "27", value: "Romance" },
        { id: "28", value: "School life" },
        { id: "29", value: "Sci fi" },
        { id: "30", value: "Seinen" },
        { id: "31", value: "Shoujo" },
        { id: "32", value: "Shoujo ai" },
        { id: "33", value: "Shounen" },
        { id: "34", value: "Shounen ai" },
        { id: "35", value: "Slice of life" },
        { id: "36", value: "Smut" },
        { id: "37", value: "Sports" },
        { id: "38", value: "Supernatural" },
        { id: "39", value: "Tragedy" },
        { id: "40", value: "Webtoons" },
        { id: "41", value: "Yaoi" },
        { id: "42", value: "Yuri" },
      ],
      allowExclusion: true,
      value: {},
      title: "Genre Filter",
      allowEmptySelection: false,
      maximum: undefined,
    });

    Application.registerSearchFilter({
      id: "status",
      type: "dropdown",
      options: [
        { id: "all", value: "All" },
        { id: "ongoing", value: "Ongoing" },
        { id: "completed", value: "Completed" },
      ],
      value: "all",
      title: "Status Filter",
    });
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "popular_section",
        title: "Popular",
        type: DiscoverSectionType.featured,
      },
      {
        id: "updated_section",
        title: "Recently Updated",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "new_manga_section",
        title: "New Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "genres",
        title: "Genres",
        type: DiscoverSectionType.genres,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: Nelo.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      // case "featured_section":
      //   return this.getFeaturedSectionItems(section, metadata);
      case "popular_section":
        return this.getPopularSectionItems(section, metadata);
      case "updated_section":
        return this.getUpdatedSectionItems(section, metadata);
      case "new_manga_section":
        return this.getNewMangaSectionItems(section, metadata);
      case "genres":
        return this.getGenreSectionItems(section, metadata);
      default:
        return { items: [] };
    }
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page = metadata?.page ?? 1;
    // Example URL: https://m.manganelo.com/advanced_search?s=all&page=1&keyw=it_starts_with_a_kingpin_account
    // With Genres: https://m.manganelo.com/advanced_search?s=all&g_i=_2_3_4_6_7_&page=1&keyw=it_starts_with_a_kingpin_account
    // With Status: https://m.manganelo.com/advanced_search?s=all&g_i=_2_3_4_6_7_&sts=completed&page=1&keyw=it_starts_with_a_kingpin_account

    // Covert the title to format
    query.title = query.title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const searchUrl = new URLBuilder(baseUrl)
      .addPath("advanced_search")
      .addQuery("s", "all")
      .addQuery("page", page.toString())
      .addQuery("keyw", query.title);

    // Get filter values
    const getFilterValue = (id: string) =>
      query.filters.find((filter) => filter.id == id)?.value;

    const genres = getFilterValue("genres") as
      | Record<string, "included" | "excluded">
      | undefined;
    const sortBy = getFilterValue("sortBy");

    // Add genres filter if present
    if (genres && typeof genres === "object") {
      const includedGenres = Object.entries(genres)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, value]) => value === "included")
        .map(([id]) => `_${id}_`)
        .join("");
      const excludedGenres = Object.entries(genres)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, value]) => value === "excluded")
        .map(([id]) => `_${id}_`)
        .join("");

      if (includedGenres) {
        // example: g_i=_2_3_4_ (for Action, Adult, Adventure)
        searchUrl.addQuery("g_i", includedGenres);
      }
      if (excludedGenres) {
        searchUrl.addQuery("g_e", excludedGenres);
      }
    }

    // Add sort filter
    if (sortBy) {
      switch (sortBy) {
        case "latest":
          searchUrl.addQuery("orby", "newest");
          break;
        case "oldest":
          searchUrl.addQuery("orby", "oldest");
          break;
      }
    }

    // Add status filter
    const status = getFilterValue("status");
    if (status === "completed") {
      searchUrl.addQuery("sts", "completed");
    } else if (status === "ongoing") {
      searchUrl.addQuery("sts", "ongoing");
    }

    const request = {
      url: searchUrl.build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const searchResults: SearchResultItem[] = [];

    $(".content-genres-item").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".genres-item-name");
      const title = infoLink.text().trim();
      const image = unit.find(".genres-item-img img").attr("src") || "";
      const mangaId = infoLink.attr("href");
      const latestChapter = unit.find(".genres-item-chap").text().trim() || "";
      if (!mangaId) return;

      searchResults.push({
        mangaId: mangaId,
        imageUrl: image,
        title: title,
        subtitle: latestChapter,
        metadata: undefined,
      });
    });

    // Check if there's a next page
    const hasNextPage = !!$(".panel-page-number .page-blue").next().length;

    return {
      items: searchResults,
      metadata: hasNextPage ? { page: page + 1 } : undefined,
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    // Example URL: https://m.manganelo.com/manga-af123456
    const request = {
      url: `${mangaId}`,
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);

    // Extract basic manga details
    const title = $(".story-info-right h1").text().trim();
    const altTitles = $(".variations-tableInfo .table-value h2")
      .first()
      .text()
      .trim()
      .split(";")
      .map((t) => t.trim());
    const image = $(".info-image img").attr("src") || "";
    const description = $("#panel-story-info-description")
      .text()
      .replace("Description :", "")
      .trim();
    const statusText = $(".variations-tableInfo .table-value")
      .filter((_, el) => $(el).prev(".table-label").text().includes("Status"))
      .text()
      .trim()
      .toLowerCase();

    const status: "ONGOING" | "COMPLETED" | "UNKNOWN" =
      statusText.includes("ongoing") || statusText.includes("ong")
        ? "ONGOING"
        : statusText.includes("completed") || statusText.includes("comp")
          ? "COMPLETED"
          : "UNKNOWN";

    // Extract tags
    const tags: TagSection[] = [];
    const genres: string[] = [];
    let rating = 1;

    // Parse genres from the table
    $(".variations-tableInfo .table-value")
      .filter((_, el) => $(el).prev(".table-label").text().includes("Genres"))
      .find("a")
      .each((_, element) => {
        genres.push($(element).text().trim());
      });

    // Get rating if available
    const ratingElement = $("#rate_row_cmd");
    const ratingMatch = ratingElement
      .text()
      .match(/rate\s*:\s*([\d.]+)\s*\/\s*5/i);

    if (ratingMatch && ratingMatch[1]) {
      rating = parseFloat(ratingMatch[1]);
    }

    if (genres.length > 0) {
      tags.push({
        id: "genres",
        title: "Genres",
        tags: genres.map((genre) => ({
          id: genre.toLowerCase(),
          title: genre,
        })),
      });
    }

    return {
      mangaId: mangaId,
      mangaInfo: {
        primaryTitle: title,
        secondaryTitles: altTitles,
        thumbnailUrl: image,
        synopsis: description,
        rating: rating,
        contentRating: ContentRating.EVERYONE,
        status: status,
        tagGroups: tags,
      },
    };
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const request = {
      url: `${sourceManga.mangaId}`,
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const chapters: Chapter[] = [];

    $(".a-h").each((_, element) => {
      const li = $(element);
      const link = li.find("a.chapter-name");
      const href = link.attr("href") || "";
      //const chapterId = href.replace("https://chapmanganelo.com", "");
      const chapterId = href;
      const title = link.attr("title")?.trim() || link.text().trim();

      // Extract chapter number from title using regex
      const chapterMatch = title.match(/Chapter\s+(\d+\.?\d*)/i);
      const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;

      chapters.push({
        chapterId: chapterId,
        title: title,
        sourceManga: sourceManga,
        chapNum: chapterNumber,
        volume: undefined,
        langCode: "🇬🇧",
      });
    });

    return chapters;
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    try {
      const request = {
        url: `${chapter.chapterId}`,
        method: "GET",
      };

      const $ = await this.fetchCheerio(request);

      const pages: string[] = [];
      $(".container-chapter-reader img").each((_, img) => {
        const src = $(img).attr("src") ?? $(img).attr("data-src");
        if (!src) return;

        // Extract image URL and push to pages array
        pages.push(src);
      });

      return {
        id: chapter.chapterId,
        mangaId: chapter.sourceManga.mangaId,
        pages: pages,
      };
    } catch (error) {
      const errorDetails =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Create detailed error context
      const errorContext = {
        error: errorDetails,
        stack: errorStack,
        source: "MangaNeloExtension.getChapterDetails",
        chapterId: chapter.chapterId,
        mangaId: chapter.sourceManga.mangaId,
        requestUrl: `${chapter.chapterId}`,
        timestamp: new Date().toISOString(),
      };

      console.error(
        "Chapter details fetch failed:",
        JSON.stringify(errorContext, null, 2),
      );

      throw new Error(
        `Failed to fetch chapter details. ChapterId: ${chapter.chapterId}, Error: ${errorDetails}`,
      );
    }
  }

  async getUpdatedSectionItems(
    section: DiscoverSection,
    metadata: { page?: number; collectedIds?: string[] } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    const request = {
      url: new URLBuilder(baseUrl)
        .addPath("advanced_search")
        .addQuery("s", "all")
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".content-genres-item").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".genres-item-name");
      const title = infoLink.text().trim();
      const image = unit.find(".genres-item-img img").attr("src") || "";
      // Example URL: https://m.manganelo.com/manga-af123456
      const mangaId = infoLink.attr("href");
      const chapterText = unit.find(".genres-item-chap").text().trim() || "";
      const chapterMatch = chapterText.match(/Chapter\s+(\d+(\.\d+)?)/i);
      const latest_chapter = chapterMatch ? `Ch. ${chapterMatch[1]}` : "";

      if (title && mangaId && !collectedIds.includes(mangaId)) {
        collectedIds.push(mangaId);
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            subtitle: latest_chapter,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // Check if there's a next page
    const hasNextPage = !!$(".panel-page-number .page-blue").next().length;

    return {
      items: items,
      metadata: hasNextPage ? { page: page + 1, collectedIds } : undefined,
    };
  }

  async getPopularSectionItems(
    section: DiscoverSection,
    metadata: { page?: number; collectedIds?: string[] } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    const request = {
      url: new URLBuilder(baseUrl)
        .addPath("advanced_search")
        .addQuery("s", "all")
        .addQuery("orby", "topview")
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".content-genres-item").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".genres-item-name");
      const title = infoLink.text().trim();
      const image = unit.find(".genres-item-img img").attr("src") || "";
      // Example URL: https://m.manganelo.com/manga-af123456
      const mangaId = infoLink.attr("href");

      if (title && mangaId && !collectedIds.includes(mangaId)) {
        collectedIds.push(mangaId);
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // Check if there's a next page
    const hasNextPage = !!$(".panel-page-number .page-blue").next().length;

    return {
      items: items,
      metadata: hasNextPage ? { page: page + 1, collectedIds } : undefined,
    };
  }

  async getNewMangaSectionItems(
    section: DiscoverSection,
    metadata: { page?: number; collectedIds?: string[] } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    const request = {
      url: new URLBuilder(baseUrl)
        .addPath("advanced_search")
        .addQuery("s", "all")
        .addQuery("orby", "newest")
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".content-genres-item").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".genres-item-name");
      const title = infoLink.text().trim();
      const image = unit.find(".genres-item-img img").attr("src") || "";
      // Example URL: https://m.manganelo.com/manga-af123456
      const mangaId = infoLink.attr("href");
      const chapterText = unit.find(".genres-item-chap").text().trim() || "";
      const chapterMatch = chapterText.match(/Chapter\s+(\d+(\.\d+)?)/i);
      const latest_chapter = chapterMatch ? `Ch. ${chapterMatch[1]}` : "";

      if (title && mangaId && !collectedIds.includes(mangaId)) {
        collectedIds.push(mangaId);
        items.push(
          createDiscoverSectionItem({
            id: mangaId,
            image: image,
            title: title,
            subtitle: latest_chapter,
            type: "simpleCarouselItem",
          }),
        );
      }
    });

    // Check if there's a next page
    const hasNextPage = !!$(".panel-page-number .page-blue").next().length;

    return {
      items: items,
      metadata: hasNextPage ? { page: page + 1, collectedIds } : undefined,
    };
  }

  async getGenreSectionItems(
    section: DiscoverSection,
    metadata: { page?: number; collectedIds?: string[] } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const items = [
      { id: "2", name: "Action" },
      { id: "3", name: "Adult" },
      { id: "4", name: "Adventure" },
      { id: "6", name: "Comedy" },
      { id: "7", name: "Cooking" },
      { id: "9", name: "Doujinshi" },
      { id: "10", name: "Drama" },
      { id: "11", name: "Ecchi" },
      { id: "48", name: "Erotica" },
      { id: "12", name: "Fantasy" },
      { id: "13", name: "Gender bender" },
      { id: "14", name: "Harem" },
      { id: "15", name: "Historical" },
      { id: "16", name: "Horror" },
      { id: "45", name: "Isekai" },
      { id: "17", name: "Josei" },
      { id: "44", name: "Manhua" },
      { id: "43", name: "Manhwa" },
      { id: "19", name: "Martial arts" },
      { id: "20", name: "Mature" },
      { id: "21", name: "Mecha" },
      { id: "22", name: "Medical" },
      { id: "24", name: "Mystery" },
      { id: "25", name: "One shot" },
      { id: "47", name: "Pornographic" },
      { id: "26", name: "Psychological" },
      { id: "27", name: "Romance" },
      { id: "28", name: "School life" },
      { id: "29", name: "Sci fi" },
      { id: "30", name: "Seinen" },
      { id: "31", name: "Shoujo" },
      { id: "32", name: "Shoujo ai" },
      { id: "33", name: "Shounen" },
      { id: "34", name: "Shounen ai" },
      { id: "35", name: "Slice of life" },
      { id: "36", name: "Smut" },
      { id: "37", name: "Sports" },
      { id: "38", name: "Supernatural" },
      { id: "39", name: "Tragedy" },
      { id: "40", name: "Webtoons" },
      { id: "41", name: "Yaoi" },
      { id: "42", name: "Yuri" },
    ];

    return {
      items: items.map((item) => ({
        type: "genresCarouselItem",
        searchQuery: {
          title: "",
          filters: [
            {
              id: "genres",
              value: { [item.id]: "included" },
            },
          ],
        },
        name: item.name,
        metadata: metadata ? { page: metadata.page } : undefined,
      })),
    };
  }

  getMangaShareUrl(mangaId: string): string {
    return `${mangaId}`;
  }

  checkCloudflareStatus(status: number): void {
    if (status === 503 || status === 403) {
      throw new CloudflareError({ url: baseUrl, method: "GET" });
    }
  }

  async fetchCheerio(request: Request): Promise<CheerioAPI> {
    const [response, data] = await Application.scheduleRequest(request);
    this.checkCloudflareStatus(response.status);
    return cheerio.load(Application.arrayBufferToUTF8String(data));
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

export const Manganelo = new MangaNeloExtension();
