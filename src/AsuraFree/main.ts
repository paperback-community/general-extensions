import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
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
import { URLBuilder } from "../utils/url-builder/array-query-variant";
import { AS_API_DOMAIN, AS_DOMAIN } from "./AsuraFreeConfig";
import { AsuraFreeInterceptor } from "./AsuraFreeInterceptor";
import {
  isLastPage,
  parseChapters,
  parseFeaturedSection,
  parseMangaDetails,
  parsePopularSection,
  parseSearch,
  parseTags,
  parseUpdateSection,
} from "./AsuraFreeParser";
import { setFilters } from "./AsuraFreeUtils";
import {
  AsuraScansFreeMetadata,
  Filters,
} from "./interfaces/AsuraScansFreeInterfaces";

export class AsuraScansFreeExtension
  implements
    Extension,
    SearchResultsProviding,
    MangaProviding,
    ChapterProviding,
    DiscoverSectionProviding
{
  globalRateLimiter = new BasicRateLimiter("ratelimiter", {
    numberOfRequests: 10,
    bufferInterval: 0.5,
    ignoreImages: true,
  });

  requestManager = new AsuraFreeInterceptor("main");

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.requestManager.registerInterceptor();
    if (Application.isResourceLimited) return;

    // for (const tags of await this.getSearchTags()) {
    //   Application.registerSearchFilter({
    //     type: "multiselect",
    //     options: tags.tags.map((x) => ({ id: x.id, value: x.title })),
    //     id: tags.id,
    //     allowExclusion: false,
    //     title: tags.title,
    //     value: {},
    //     allowEmptySelection: true,
    //     maximum: undefined,
    //   });
    // }
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
    let urlBuilder = new URLBuilder(AS_DOMAIN);
    const page: number = metadata?.page ?? 1;
    if (section.type === DiscoverSectionType.simpleCarousel) {
      urlBuilder = urlBuilder.addPath("serie");
      urlBuilder = urlBuilder
        .addQuery("page", page.toString())
        .addQuery("order", "update");
    }
    const [_, buffer] = await Application.scheduleRequest({
      url: urlBuilder.build(),
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    switch (section.type) {
      case DiscoverSectionType.featured:
        items = await parseFeaturedSection($);
        break;
      case DiscoverSectionType.chapterUpdates:
        items = await parsePopularSection($);
        break;
      case DiscoverSectionType.simpleCarousel:
        items = await parseUpdateSection($);
        metadata = !isLastPage($) ? { page: page + 1 } : undefined;
        break;
      case DiscoverSectionType.genres:
        if (section.id === "type") {
          items = [];
          const tags: TagSection[] = await this.getSearchTags();
          for (const tag of tags[2].tags) {
            items.push({
              type: "genresCarouselItem",
              searchQuery: {
                title: tag.title,
                filters: [
                  {
                    id: tag.id,
                    value: {
                      [tag.id]: "included",
                    },
                  },
                ],
              },
              name: tag.title,
              metadata: metadata,
            });
          }
        }
        if (section.id === "genres") {
          items = [];
          const tags: TagSection[] = await this.getSearchTags();
          for (const tag of tags[0].tags) {
            items.push({
              type: "genresCarouselItem",
              searchQuery: {
                title: tag.title,
                filters: [
                  {
                    id: tag.id,
                    value: {
                      [tag.id]: "included",
                    },
                  },
                ],
              },
              name: tag.title,
              metadata: metadata,
            });
          }
        }
        if (section.id === "status") {
          items = [];
          const tags: TagSection[] = await this.getSearchTags();
          for (const tag of tags[1].tags) {
            items.push({
              type: "genresCarouselItem",
              searchQuery: {
                title: tag.title,
                filters: [
                  {
                    id: tag.id,
                    value: {
                      [tag.id]: "included",
                    },
                  },
                ],
              },
              name: tag.title,
              metadata: metadata,
            });
          }
        }
    }
    return { items, metadata };
  }

  getMangaShareUrl(mangaId: string): string {
    return `${AS_DOMAIN}/serie/${mangaId}`;
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request = {
      url: new URLBuilder(AS_DOMAIN).addPath("serie").addPath(mangaId).build(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return await parseMangaDetails($, mangaId);
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const request = {
      url: new URLBuilder(AS_DOMAIN)
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
    const url = new URLBuilder(AS_DOMAIN)
      .addPath(chapter.sourceManga.mangaId + "-chapter-" + chapter.chapterId)
      .build();

    const request: Request = {
      url,
      method: "GET",
    };

    const [, buffer] = await Application.scheduleRequest(request);
    const result = await Application.executeInWebView({
      source: {
        html: Application.arrayBufferToUTF8String(buffer),
        baseUrl: AS_DOMAIN,
        loadCSS: false,
        loadImages: false,
      },
      inject:
        "const array = Array.from(document.querySelectorAll('img.ts-main-image'));const imgSrcArray = Array.from(array).map(img => img.src); return imgSrcArray;",
      storage: { cookies: [] },
    });
    const pages: string[] = result.result as string[];
    // return parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId)
    return {
      mangaId: chapter.sourceManga.mangaId,
      id: chapter.chapterId,
      pages,
    };
  }

  async getGenres(): Promise<string[]> {
    try {
      const request = {
        url: new URLBuilder(AS_API_DOMAIN)
          .addPath("api")
          .addPath("series")
          .addPath("filters")
          .build(),
        method: "GET",
      };

      const [_, buffer] = await Application.scheduleRequest(request);
      const data: Filters = JSON.parse(
        Application.arrayBufferToUTF8String(buffer),
      ) as Filters;
      return data.genres.map((a) => a.name);
    } catch (error) {
      throw new Error(error as string);
    }
  }

  async getSearchTags(): Promise<TagSection[]> {
    try {
      const request = {
        url: new URLBuilder(AS_API_DOMAIN)
          .addPath("api")
          .addPath("series")
          .addPath("filters")
          .build(),
        method: "GET",
      };

      const [_, buffer] = await Application.scheduleRequest(request);
      const data: Filters = JSON.parse(
        Application.arrayBufferToUTF8String(buffer),
      ) as Filters;

      // Set filters for mangaDetails
      await setFilters(data);

      return parseTags(data);
    } catch (error) {
      throw new Error(error as string);
    }
  }

  async supportsTagExclusion(): Promise<boolean> {
    return false;
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: AsuraScansFreeMetadata | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page: number = metadata?.page ?? 1;

    // let urlBuilder: URLBuilder = new URLBuilder(AS_DOMAIN)
    //   .addPathComponent("series")
    //   .addQueryParameter("page", page.toString());

    let newUrlBuilder: URLBuilder = new URLBuilder(AS_DOMAIN)
      .addPath("page")
      .addPath(page.toString());

    if (query?.title) {
      // urlBuilder = urlBuilder.addQueryParameter(
      //   "name",
      //   encodeURIComponent(query?.title.replace(/[’‘´`'-][a-z]*/g, "%") ?? ""),
      // );
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

    // const response = await this.requestManager.schedule(request, 1)
    const $ = cheerio.load(Application.arrayBufferToUTF8String(response[1]));

    const items = await parseSearch($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;
    return {
      items,
      metadata,
    };
  }
}

export const AsuraFree = new AsuraScansFreeExtension();
