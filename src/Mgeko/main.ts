import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
  CloudflareBypassRequestProviding,
  CloudflareError,
  Cookie,
  CookieStorageInterceptor,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  EndOfPageResults,
  Extension,
  MangaProviding,
  PagedResults,
  PaperbackInterceptor,
  Request,
  Response,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SourceManga,
  TagSection,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { URLBuilder } from "../utils/url-builder/base";
import {
  isLastPage,
  parseChapterDetails,
  parseChapters,
  parseMangaDetails,
  parseSearch,
  parseTags,
  parseViewMore,
} from "./MgekoParser";

const MGEKO_DOMAIN = "https://www.mgeko.cc";

type MgekoImplementation = Extension &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding &
  DiscoverSectionProviding &
  CloudflareBypassRequestProviding;

class MgekoInterceptor extends PaperbackInterceptor {
  async interceptRequest(request: Request): Promise<Request> {
    request.headers = {
      ...(request.headers ?? {}),
      ...{
        referer: `${MGEKO_DOMAIN}/`,
        "user-agent": await Application.getDefaultUserAgent(),
      },
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

export class MgekoExtension implements MgekoImplementation {
  globalRateLimiter = new BasicRateLimiter("rateLimiter", {
    numberOfRequests: 4,
    bufferInterval: 1,
    ignoreImages: true,
  });

  mainRequestInterceptor = new MgekoInterceptor("main");
  cookieStorageInterceptor = new CookieStorageInterceptor({
    storage: "stateManager",
  });

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.mainRequestInterceptor.registerInterceptor();
    this.cookieStorageInterceptor.registerInterceptor();

    Application.registerSearchFilter({
      id: "sortBy",
      type: "dropdown",
      options: [
        { id: "Random", value: "Random" },
        { id: "New", value: "New" },
        { id: "Updated", value: "Updated" },
        { id: "Views", value: "Views" },
      ],
      value: "Views",
      title: "Sort By Filter",
    });

    const searchTags = await this.getSearchTags();

    for (const tags of searchTags) {
      Application.registerSearchFilter({
        type: "multiselect",
        options: tags.tags.map((x) => ({ id: x.id, value: x.title })),
        id: tags.id,
        allowExclusion: true,
        title: tags.title,
        value: {},
        allowEmptySelection: true,
        maximum: undefined,
      });
    }
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "most_viewed",
        title: "Most Viewed",
        type: DiscoverSectionType.prominentCarousel,
      },
      {
        id: "new",
        title: "New",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "latest_updates",
        title: "Latest Updates",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: Mgeko.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      case "most_viewed":
        return this.getMostViewedSectionItems(metadata);
      case "new":
        return this.getNewSectionItems(metadata);
      case "latest_updates":
        return this.getLatestUpdatesSectionItems(metadata);
      default:
        return {
          items: [],
          metadata: undefined,
        };
    }
  }

  async saveCloudflareBypassCookies(cookies: Cookie[]): Promise<void> {
    for (const cookie of cookies) {
      if (
        cookie.name.startsWith("cf") ||
        cookie.name.startsWith("_cf") ||
        cookie.name.startsWith("__cf")
      ) {
        this.cookieStorageInterceptor.setCookie(cookie);
      }
    }
  }

  async getSearchTags(): Promise<TagSection[]> {
    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN).addPath("browse-comics").build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    return parseTags($);
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request: Request = {
      url: `${MGEKO_DOMAIN}/manga/${mangaId}`,
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);
    return parseMangaDetails($, mangaId);
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN)
        .addPath("manga")
        .addPath(sourceManga.mangaId)
        .addPath("all-chapters")
        .build(),
      method: "GET",
    };

    const $ = await this.fetchCheerio(request);
    return parseChapters($, sourceManga);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN)
        .addPath("reader")
        .addPath("en")
        .addPath(chapter.chapterId)
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);
    return parseChapterDetails($, chapter);
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: Mgeko.Metadata | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page: number = metadata?.page ?? 1;
    let request: Request;

    // Regular search
    if (query.title) {
      request = {
        url: new URLBuilder(MGEKO_DOMAIN)
          .addPath("search")
          .addQuery("search", encodeURI(query.title))
          .build(),
        method: "GET",
      };

      // Tag Search
    } else {
      const getFilterValue = (id: string) =>
        query.filters.find((filter) => filter.id === id)?.value;

      const genres = getFilterValue("genres") as Record<
        string,
        "included" | "excluded"
      >;
      const genreIncluded = Object.entries(genres)
        .filter(([, value]) => value === "included")
        .map(([key]) => key)
        .join(",");

      const genreExcluded = Object.entries(genres)
        .filter(([, value]) => value === "excluded")
        .map(([key]) => key)
        .join(",");

      const sortBy = getFilterValue("sortBy") as string;

      request = {
        url: new URLBuilder(MGEKO_DOMAIN)
          .addPath("browse-advanced")
          .addQuery("sort_by", sortBy)
          .addQuery("genre_included", genreIncluded)
          .addQuery("genre_excluded", genreExcluded)
          .addQuery("results", page)
          .build(),
        method: "GET",
      };
    }

    const $ = await this.fetchCheerio(request);
    const manga = parseSearch($, MGEKO_DOMAIN);

    metadata = !isLastPage($) ? { page: page + 1 } : undefined;
    const pagedResults: PagedResults<SearchResultItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  async getMostViewedSectionItems(
    metadata: Mgeko.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    if (metadata?.completed) return EndOfPageResults;

    const page: number = metadata?.page ?? 1;

    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN)
        .addPath("browse-comics")
        .addQuery("results", page)
        .addQuery("filter", "Views")
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);
    const manga = parseViewMore($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;

    const pagedResults: PagedResults<DiscoverSectionItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  async getNewSectionItems(
    metadata: Mgeko.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    if (metadata?.completed) return EndOfPageResults;

    const page: number = metadata?.page ?? 1;

    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN)
        .addPath("browse-comics")
        .addQuery("results", page)
        .addQuery("filter", "New")
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);
    const manga = parseViewMore($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;

    const pagedResults: PagedResults<DiscoverSectionItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  async getLatestUpdatesSectionItems(
    metadata: Mgeko.Metadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    if (metadata?.completed) return EndOfPageResults;

    const page: number = metadata?.page ?? 1;

    const request: Request = {
      url: new URLBuilder(MGEKO_DOMAIN)
        .addPath("browse-comics")
        .addQuery("results", page)
        .addQuery("filter", "Updated")
        .build(),
      method: "GET",
    };
    const $ = await this.fetchCheerio(request);
    const manga = parseViewMore($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;

    const pagedResults: PagedResults<DiscoverSectionItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  checkCloudflareStatus(status: number): void {
    if (status == 503 || status == 403) {
      throw new CloudflareError({ url: MGEKO_DOMAIN, method: "GET" });
    }
  }

  async fetchCheerio(request: Request): Promise<CheerioAPI> {
    const [response, data] = await Application.scheduleRequest(request);
    this.checkCloudflareStatus(response.status);
    return cheerio.load(Application.arrayBufferToUTF8String(data));
  }
}

export const Mgeko = new MgekoExtension();
