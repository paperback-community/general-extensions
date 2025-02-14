import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
  CloudflareBypassRequestProviding,
  Cookie,
  CookieStorageInterceptor,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  Extension,
  MangaProviding,
  PagedResults,
  Request,
  SearchFilter,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SourceManga,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { URLBuilder } from "../utils/url-builder/array-query-variant";
import { ASF_DOMAIN } from "./AsuraScansFreeConfig";
import { AsuraFreeInterceptor } from "./AsuraScansFreeInterceptor";
import {
  isLastPage,
  parseChapterDetails,
  parseChapters,
  parseFeaturedSection,
  parseMangaDetails,
  parsePopularSection,
  parseSearch,
  parseUpdateSection,
} from "./AsuraScansFreeParser";
import { AsuraScansFreeMetadata } from "./interfaces/AsuraScansFreeInterfaces";

export class AsuraScansFreeExtension
  implements
    Extension,
    SearchResultsProviding,
    MangaProviding,
    ChapterProviding,
    DiscoverSectionProviding,
    CloudflareBypassRequestProviding
{
  globalRateLimiter = new BasicRateLimiter("ratelimiter", {
    numberOfRequests: 10,
    bufferInterval: 0.5,
    ignoreImages: true,
  });

  requestManager = new AsuraFreeInterceptor("main");

  cookieStorageInterceptor = new CookieStorageInterceptor({
    storage: "stateManager",
  });

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.requestManager.registerInterceptor();
    this.cookieStorageInterceptor.registerInterceptor();
    if (Application.isResourceLimited) return;
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "popular",
        title: "Popular Today",
        type: DiscoverSectionType.featured,
      },

      {
        id: "latest_updates",
        title: "Latest Updates",
        // containsMoreItems: true,
        type: DiscoverSectionType.simpleCarousel,
      },

      // {
      //   id: "type",
      //   title: "Types",
      //   type: DiscoverSectionType.genres,
      // },

      // {
      //   id: "genres",
      //   title: "Genres",
      //   type: DiscoverSectionType.genres,
      // },

      // {
      //   id: "status",
      //   title: "Status",
      //   type: DiscoverSectionType.genres,
      // },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: AsuraScansFreeMetadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    let items: DiscoverSectionItem[] = [];
    let urlBuilder = new URLBuilder(ASF_DOMAIN);
    const page: number = metadata?.page ?? 1;
    if (section.type === DiscoverSectionType.simpleCarousel) {
      urlBuilder = urlBuilder.addPath("serie");
      urlBuilder = urlBuilder
        .addQuery("page", page.toString())
        .addQuery("order", "update");
    }

    switch (section.type) {
      case DiscoverSectionType.featured: {
        const [status, buffer] = await Application.scheduleRequest({
          url: urlBuilder.build(),
          method: "GET",
        });
        console.log(status.status);

        if (status.status !== 200) {
          throw new Error(`${status.status} code received!`);
        }
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        items = await parseFeaturedSection($);
        break;
      }
      case DiscoverSectionType.chapterUpdates: {
        const [status, buffer] = await Application.scheduleRequest({
          url: urlBuilder.build(),
          method: "GET",
        });
        console.log(status.status);

        if (status.status !== 200) {
          throw new Error(`${status.status} code received!`);
        }
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        items = await parsePopularSection($);
        break;
      }
      case DiscoverSectionType.simpleCarousel: {
        const [status, buffer] = await Application.scheduleRequest({
          url: urlBuilder.build(),
          method: "GET",
        });
        console.log(status.status);

        if (status.status !== 200) {
          throw new Error(`${status.status} code received!`);
        }
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        items = await parseUpdateSection($);
        metadata = !isLastPage($) ? { page: page + 1 } : undefined;
        break;
      }
      case DiscoverSectionType.genres:
        break;
    }
    return { items, metadata };
  }

  getMangaShareUrl(mangaId: string): string {
    return `${ASF_DOMAIN}/serie/${mangaId}`;
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request = {
      url: new URLBuilder(ASF_DOMAIN).addPath("serie").addPath(mangaId).build(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return await parseMangaDetails($, mangaId);
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const request = {
      url: new URLBuilder(ASF_DOMAIN)
        .addPath("serie")
        .addPath(sourceManga.mangaId)
        .build(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return parseChapters($, sourceManga);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const url = new URLBuilder(ASF_DOMAIN)
      .addPath(chapter.sourceManga.mangaId + "-chapter-" + chapter.chapterId)
      .build();

    const request: Request = { url, method: "GET" };

    const [, buffer] = await Application.scheduleRequest(request);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return parseChapterDetails(
      $,
      chapter.sourceManga.mangaId,
      chapter.chapterId,
    );
  }

  async supportsTagExclusion(): Promise<boolean> {
    return false;
  }

  getSearchFilters(): Promise<SearchFilter[]> {
    return Promise.resolve([]);
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: AsuraScansFreeMetadata | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page: number = metadata?.page ?? 1;

    let newUrlBuilder: URLBuilder = new URLBuilder(ASF_DOMAIN)
      .addPath("page")
      .addPath(page.toString());

    if (query?.title) {
      newUrlBuilder = newUrlBuilder.addQuery(
        "s",
        encodeURIComponent(query?.title.replace(/[’‘´`'-][a-z]*/g, "%") ?? "a"),
      );
    } else {
      newUrlBuilder = newUrlBuilder.addQuery("s", "a");
    }

    const response = await Application.scheduleRequest({
      url: newUrlBuilder.build(),
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(response[1]));

    const items = await parseSearch($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;
    return { items, metadata };
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
}

export const AsuraScansFree = new AsuraScansFreeExtension();
