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
import { FireInterceptor } from "./MangaFireInterceptor";

const baseUrl = "https://mangafire.to";

type MangaFireImplementation = Extension &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding &
  DiscoverSectionProviding;

export class MangaFireExtension implements MangaFireImplementation {
  requestManager = new FireInterceptor("main");

  async initialise(): Promise<void> {
    this.requestManager.registerInterceptor();

    Application.registerSearchFilter({
      id: "type",
      type: "dropdown",
      options: [
        { id: "all", value: "All" },
        { id: "manhua", value: "Manhua" },
        { id: "manhwa", value: "Manhwa" },
        { id: "manga", value: "Manga" },
      ],
      value: "all",
      title: "Type Filter",
    });

    Application.registerSearchFilter({
      id: "genres",
      type: "multiselect",
      options: [
        { id: "1", value: "Action" },
        { id: "78", value: "Adventure" },
        { id: "3", value: "Avant Garde" },
        { id: "4", value: "Boys Love" },
        { id: "5", value: "Comedy" },
        { id: "77", value: "Demons" },
        { id: "6", value: "Drama" },
        { id: "7", value: "Ecchi" },
        { id: "79", value: "Fantasy" },
        { id: "9", value: "Girls Love" },
        { id: "10", value: "Gourmet" },
        { id: "11", value: "Harem" },
        { id: "530", value: "Horror" },
        { id: "13", value: "Isekai" },
        { id: "531", value: "Iyashikei" },
        { id: "15", value: "Josei" },
        { id: "532", value: "Kids" },
        { id: "539", value: "Magic" },
        { id: "533", value: "Mahou Shoujo" },
        { id: "534", value: "Martial Arts" },
        { id: "19", value: "Mecha" },
        { id: "535", value: "Military" },
        { id: "21", value: "Music" },
        { id: "22", value: "Mystery" },
        { id: "23", value: "Parody" },
        { id: "536", value: "Psychological" },
        { id: "25", value: "Reverse Harem" },
        { id: "26", value: "Romance" },
        { id: "73", value: "School" },
        { id: "28", value: "Sci-Fi" },
        { id: "537", value: "Seinen" },
        { id: "30", value: "Shoujo" },
        { id: "31", value: "Shounen" },
        { id: "538", value: "Slice of Life" },
        { id: "33", value: "Space" },
        { id: "34", value: "Sports" },
        { id: "75", value: "Super Power" },
        { id: "76", value: "Supernatural" },
        { id: "37", value: "Suspense" },
        { id: "38", value: "Thriller" },
        { id: "39", value: "Vampire" },
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
        { id: "completed", value: "Completed" },
        { id: "releasing", value: "Releasing" },
        { id: "hiatus", value: "On Hiatus" },
        { id: "discontinued", value: "Discontinued" },
        { id: "not_published", value: "Not Yet Published" },
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
        id: "genres_section",
        title: "Genres",
        type: DiscoverSectionType.genres,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: MangaFire.Metadata | undefined,
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
      case "genres_section":
        return this.getFilterSection();
      default:
        return { items: [] };
    }
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page = metadata?.page ?? 1;
    // Example: https://mangafire.to/filter?keyword=one%20piece&page=1&genre_mode=and&type[]=manhwa&genre[]=action&status[]=releasing&sort=most_relevance
    // Multple Genres: https://mangafire.to/filter?keyword=one+piece&type%5B%5D=manga&genre%5B%5D=1&genre%5B%5D=31&genre_mode=and&status%5B%5D=releasing&sort=most_relevance
    // No Genre: https://mangafire.to/filter?keyword=one+piece&type%5B%5D=manga&genre_mode=and&status%5B%5D=releasing&sort=most_relevance
    // With pages: https://mangafire.to/filter?page=2&keyword=one%20piece
    // ALL: https://mangafire.to/filter?keyword=one+peice&sort=recently_updated
    // Exclude: https://mangafire.to/filter?keyword=&genre%5B%5D=-9&sort=recently_updated
    const searchUrl = new URLBuilder(baseUrl)
      .addPath("filter")
      .addQuery("keyword", query.title)
      .addQuery("page", page.toString())
      .addQuery("genre_mode", "and");

    const getFilterValue = (id: string) =>
      query.filters.find((filter) => filter.id == id)?.value;

    const type = getFilterValue("type");
    const genres = getFilterValue("genres") as
      | Record<string, "included" | "excluded">
      | undefined;
    const status = getFilterValue("status");

    if (type && type != "all") {
      searchUrl.addQuery("type[]", type);
    }

    // Handle included and excluded genres
    if (genres && typeof genres === "object") {
      Object.entries(genres).forEach(([id, value]) => {
        if (value === "included") {
          searchUrl.addQuery("genre[]", id);
        } else if (value === "excluded") {
          searchUrl.addQuery("genre[]", `-${id}`);
        }
      });
    }

    if (status && status != "all") {
      let statusValue: string;
      switch (status) {
        case "completed":
          statusValue = "completed";
          break;
        case "releasing":
          statusValue = "releasing";
          break;
        case "hiatus":
          statusValue = "hiatus";
          break;
        case "discontinued":
          statusValue = "discontinued";
          break;
        case "not_published":
          statusValue = "not_published";
          break;
        default:
          statusValue = "releasing";
      }
      searchUrl.addQuery("status[]", statusValue);
    }

    const request = {
      url: searchUrl.build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const searchResults: SearchResultItem[] = [];

    $(".original.card-lg .unit .inner").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".info > a");
      const title = infoLink.text().trim();
      const image = unit.find("img").attr("src") || "";
      const mangaId = infoLink.attr("href")?.replace("/manga/", "") || "";
      const latestChapter = unit
        .find(".content[data-name='chap'] a")
        .first()
        .find("span")
        .first()
        .text()
        .trim();
      const latestChapterMatch = latestChapter.match(/Chap (\d+)/);
      const subtitle = latestChapterMatch
        ? `Ch. ${latestChapterMatch[1]}`
        : undefined;

      if (!title || !mangaId) {
        return;
      }

      searchResults.push({
        mangaId: mangaId,
        imageUrl: image,
        title: title,
        subtitle: subtitle,
        metadata: undefined,
      });
    });

    // Check if there's a next page
    const hasNextPage = !!$(".page-item.active + .page-item .page-link").length;

    return {
      items: searchResults,
      metadata: hasNextPage ? { page: page + 1 } : undefined,
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request = {
      url: new URLBuilder(baseUrl).addPath("manga").addPath(mangaId).build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);

    // Extract basic manga details
    const title = $(".manga-detail .info h1").text().trim();
    const altTitles = [$(".manga-detail .info h6").text().trim()];
    const image = $(".manga-detail .poster img").attr("src") || "";
    const description = $(".manga-detail .info .description").text().trim();
    const authors: string[] = [];
    $("#info-rating .meta div").each((_, element) => {
      const label = $(element).find("span").first().text().trim();
      if (label === "Author:") {
        $(element)
          .find("a")
          .each((_, authorElement) => {
            authors.push($(authorElement).text().trim());
          });
      }
    });
    let status = "UNKNOWN";
    const statusText = $(".manga-detail .info .min-info").text().toLowerCase();
    if (statusText.includes("releasing")) {
      status = "ONGOING";
    } else if (statusText.includes("completed")) {
      status = "COMPLETED";
    } else if (
      statusText.includes("hiatus") ||
      statusText.includes("discontinued") ||
      statusText.includes("not yet published")
    ) {
      status = "UNKNOWN";
    }

    // Extract tags
    const tags: TagSection[] = [];
    const genres: string[] = [];
    let rating = 1;

    // Parse info-rating section
    $("#info-rating .meta div").each((_, element) => {
      const label = $(element).find("span").first().text().trim();
      if (label === "Genres:") {
        $(element)
          .find("a")
          .each((_, genreElement) => {
            genres.push($(genreElement).text().trim());
          });
      }
    });

    // Get rating if available
    const ratingValue = $("#info-rating .score .live-score").text().trim();
    if (ratingValue) {
      rating = parseFloat(ratingValue) / 2; // Convert 10-point scale to 5-point scale
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
        status: status as "ONGOING" | "COMPLETED" | "UNKNOWN",
        tagGroups: tags,
      },
    };
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    // example https://mangafire.to/ajax/read/0w5k/chapter/en
    const request = {
      url: new URLBuilder(baseUrl)
        .addPath("ajax")
        .addPath("read")
        .addPath(sourceManga.mangaId.split(".")[1])
        .addPath("chapter")
        .addPath("en")
        .build(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);

    const r: MangaFire.Result = JSON.parse(
      Application.arrayBufferToUTF8String(buffer),
    ) as MangaFire.Result;
    const $ = cheerio.load(r.result.html);

    const chapters: Chapter[] = [];

    $("li").each((_, element) => {
      const li = $(element);
      const link = li.find("a");
      const chapterId = link.attr("data-id") || "0";
      const title = link.find("span").first().text().trim();
      // Extract chapter number from data-number attribute
      const chapterNumber = parseFloat(link.attr("data-number") || "0");
      //const timestamp = parseInt(li.find('span').last().attr('data-date') || '0') * 1000;
      //const creationDate = new Date(timestamp).toISOString()

      chapters.push({
        chapterId: chapterId,
        title: title,
        sourceManga: sourceManga,
        chapNum: chapterNumber,
        //creationDate: new Date(creationDate),
        volume: undefined,
        langCode: "🇬🇧",
      });
    });

    return chapters;
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    console.log(`Parsing chapter ${chapter.chapterId}`);
    try {
      // Utilizing ajax API
      // Example: https://mangafire.to/ajax/read/chapter/3832635
      const url = new URLBuilder(baseUrl)
        .addPath("ajax")
        .addPath("read")
        .addPath("chapter")
        .addPath(chapter.chapterId)
        .build();

      console.log(url);

      const request: Request = {
        url,
        method: "GET",
      };

      const [_, buffer] = await Application.scheduleRequest(request);
      const json: MangaFire.PageResponse = JSON.parse(
        Application.arrayBufferToUTF8String(buffer),
      ) as MangaFire.PageResponse;

      const pages: string[] = [];
      json.result.images.forEach((value: MangaFire.ImageData) => {
        pages.push(value[0]);
      });
      return {
        mangaId: chapter.sourceManga.mangaId,
        id: chapter.chapterId,
        pages,
      };
    } catch (error) {
      console.error(
        `Failed to fetch chapter details for chapterId: ${chapter.chapterId}`,
        error,
      );
      throw new Error(
        `Failed to fetch chapter details for chapterId: ${chapter.chapterId}`,
      );
    }
  }

  getMangaShareUrl(mangaId: string): string {
    return `${baseUrl}/manga/${mangaId}`;
  }

  async getUpdatedSectionItems(
    section: DiscoverSection,
    metadata: { page?: number; collectedIds?: string[] } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;
    const collectedIds = metadata?.collectedIds ?? [];

    // Example: https://mangafire.to/filter?keyword=&language[]=en&sort=recently_updated&page=1
    const request = {
      url: new URLBuilder(baseUrl)
        .addPath("filter")
        .addQuery("keyword", "")
        .addQuery("language[]", "en")
        .addQuery("sort", "recently_updated")
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".unit .inner").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".info > a").last(); // Get the manga title link
      const title = infoLink.text().trim();
      const image = unit.find(".poster img").attr("src") || "";
      const mangaId = infoLink.attr("href")?.replace("/manga/", "") || "";
      const latest_chapter = unit
        .find(".content[data-name='chap']")
        .find("a")
        .eq(0)
        .text()
        .trim();
      const latestChapterMatch = latest_chapter.match(/Chap (\d+)/);
      const subtitle = latestChapterMatch
        ? `Ch. ${latestChapterMatch[1]}`
        : undefined;

      if (title && mangaId && !collectedIds.includes(mangaId)) {
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

    // Check if there's a next page
    const hasNextPage = !!$(".page-item.active + .page-item .page-link").length;

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
        .addPath("filter")
        .addQuery("keyword", "")
        .addQuery("language[]", "en")
        .addQuery("sort", "most_viewed")
        .addQuery("page", page.toString())
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".unit .inner").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".info > a").last(); // Get the manga title link
      const title = infoLink.text().trim();
      const image = unit.find(".poster img").attr("src") || "";
      const mangaId = infoLink.attr("href")?.replace("/manga/", "") || "";

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
    const hasNextPage = !!$(".page-item.active + .page-item .page-link").length;

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
      url: new URLBuilder(baseUrl).addPath("added").build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    const items: DiscoverSectionItem[] = [];

    $(".unit .inner").each((_, element) => {
      const unit = $(element);
      const infoLink = unit.find(".info > a").last();
      const title = infoLink.text().trim();
      const image = unit.find(".poster img").attr("src") || "";
      const mangaId = infoLink.attr("href")?.replace("/manga/", "") || "";

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
    const hasNextPage = !!$(".page-item.active + .page-item .page-link").length;

    return {
      items: items,
      metadata: hasNextPage ? { page: page + 1, collectedIds } : undefined,
    };
  }

  async getFilterSection(): Promise<PagedResults<DiscoverSectionItem>> {
    const items = [
      { id: "manhua", name: "Manhua", type: "type" },
      { id: "manhwa", name: "Manhwa", type: "type" },
      { id: "manga", name: "Manga", type: "type" },
      { id: "1", name: "Action", type: "genres" },
      { id: "78", name: "Adventure", type: "genres" },
      { id: "3", name: "Avant Garde", type: "genres" },
      { id: "4", name: "Boys Love", type: "genres" },
      { id: "5", name: "Comedy", type: "genres" },
      { id: "77", name: "Demons", type: "genres" },
      { id: "6", name: "Drama", type: "genres" },
      { id: "7", name: "Ecchi", type: "genres" },
      { id: "79", name: "Fantasy", type: "genres" },
      { id: "9", name: "Girls Love", type: "genres" },
      { id: "10", name: "Gourmet", type: "genres" },
      { id: "11", name: "Harem", type: "genres" },
      { id: "530", name: "Horror", type: "genres" },
      { id: "13", name: "Isekai", type: "genres" },
      { id: "531", name: "Iyashikei", type: "genres" },
      { id: "15", name: "Josei", type: "genres" },
      { id: "532", name: "Kids", type: "genres" },
      { id: "539", name: "Magic", type: "genres" },
      { id: "533", name: "Mahou Shoujo", type: "genres" },
      { id: "534", name: "Martial Arts", type: "genres" },
      { id: "19", name: "Mecha", type: "genres" },
      { id: "535", name: "Military", type: "genres" },
      { id: "21", name: "Music", type: "genres" },
      { id: "22", name: "Mystery", type: "genres" },
      { id: "23", name: "Parody", type: "genres" },
      { id: "536", name: "Psychological", type: "genres" },
      { id: "25", name: "Reverse Harem", type: "genres" },
      { id: "26", name: "Romance", type: "genres" },
      { id: "73", name: "School", type: "genres" },
      { id: "28", name: "Sci-Fi", type: "genres" },
      { id: "537", name: "Seinen", type: "genres" },
      { id: "30", name: "Shoujo", type: "genres" },
      { id: "31", name: "Shounen", type: "genres" },
      { id: "538", name: "Slice of Life", type: "genres" },
      { id: "33", name: "Space", type: "genres" },
      { id: "34", name: "Sports", type: "genres" },
      { id: "75", name: "Super Power", type: "genres" },
      { id: "76", name: "Supernatural", type: "genres" },
      { id: "37", name: "Suspense", type: "genres" },
      { id: "38", name: "Thriller", type: "genres" },
      { id: "39", name: "Vampire", type: "genres" },
    ];

    return {
      items: items.map((item) => ({
        type: "genresCarouselItem",
        searchQuery: {
          title: "",
          filters: [
            {
              id: item.type,
              value:
                item.type === "genres" ? { [item.id]: "included" } : item.id,
            },
          ],
        },
        name: item.name,
        metadata: undefined,
      })),
      metadata: undefined,
    };
  }

  checkCloudflareStatus(status: number): void {
    if (status == 503 || status == 403) {
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

export const MangaFire = new MangaFireExtension();
