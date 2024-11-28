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
  Form,
  MangaProviding,
  PagedResults,
  Request,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SettingsFormProviding,
  SourceManga,
  TagSection,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { AS_API_DOMAIN, AS_DOMAIN } from "./AsuraConfig";
import { getFilterTagsBySection, URLBuilder } from "./AsuraHelper";
import { AsuraInterceptor } from "./AsuraInterceptor";
import {
  isLastPage,
  parseChapters,
  parseFeaturedSection,
  parseMangaDetails,
  parsePopularSection,
  parseSearch,
  parseTags,
  parseUpdateSection,
} from "./AsuraParser";
import { AsuraSettingForm } from "./AsuraSettings";
import { setFilters } from "./AsuraUtils";
import { Filters } from "./interfaces/Filters";

export class AsuraScansExtension
  implements
    Extension,
    SearchResultsProviding,
    MangaProviding,
    ChapterProviding,
    SettingsFormProviding,
    DiscoverSectionProviding
{
  globalRateLimiter = new BasicRateLimiter("ratelimiter", {
    numberOfRequests: 4,
    bufferInterval: 1,
    ignoreImages: true,
  });

  requestManager = new AsuraInterceptor("main");

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.requestManager.registerInterceptor();
    if (Application.isResourceLimited) return;

    for (const tags of await this.getSearchTags()) {
      Application.registerSearchFilter({
        type: "multiselect",
        options: tags.tags.map((x) => ({ id: x.id, value: x.title })),
        id: tags.id,
        allowExclusion: false,
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
        id: "featured",
        title: "Featured",
        type: DiscoverSectionType.featured,
      },

      {
        id: "latest_updates",
        title: "Latest Updates",
        // containsMoreItems: true,
        type: DiscoverSectionType.simpleCarousel,
      },

      {
        id: "popular_today",
        title: "Popular Today",
        type: DiscoverSectionType.chapterUpdates,
      },

      {
        id: "type",
        title: "Types",
        type: DiscoverSectionType.genres,
      },

      {
        id: "genres",
        title: "Genres",
        type: DiscoverSectionType.genres,
      },

      {
        id: "status",
        title: "Status",
        type: DiscoverSectionType.genres,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: unknown,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    let items: DiscoverSectionItem[] = [];
    const [_, buffer] = await Application.scheduleRequest({
      url: AS_DOMAIN,
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

  async getSettingsForm(): Promise<Form> {
    return new AsuraSettingForm();
  }

  getMangaShareUrl(mangaId: string): string {
    return `${AS_DOMAIN}/series/${mangaId}`;
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const request = {
      url: new URLBuilder(AS_DOMAIN)
        .addPathComponent("series")
        .addPathComponent(mangaId)
        .buildUrl(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return await parseMangaDetails($, mangaId);
  }

  async getChapters(
    sourceManga: SourceManga,
    sinceDate?: Date,
  ): Promise<Chapter[]> {
    console.log(sinceDate);
    const request = {
      url: new URLBuilder(AS_DOMAIN)
        .addPathComponent("series")
        .addPathComponent(sourceManga.mangaId)
        .buildUrl(),
      method: "GET",
    };
    const [_, buffer] = await Application.scheduleRequest(request);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return parseChapters($, sourceManga);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const url = new URLBuilder(AS_DOMAIN)
      .addPathComponent("series")
      .addPathComponent(chapter.sourceManga.mangaId)
      .addPathComponent("chapter")
      .addPathComponent(chapter.chapterId)
      .buildUrl();

    const request: Request = {
      url,
      method: "GET",
    };

    const [response, buffer] = await Application.scheduleRequest(request);
    console.log(`Status: ${response.status}`);
    // const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer))
    const result = await Application.executeInWebView({
      source: {
        html: Application.arrayBufferToUTF8String(buffer),
        baseUrl: AS_DOMAIN,
      },
      inject:
        "const array = Array.from(document.querySelectorAll('img[alt*=\"chapter\"]'));const imgSrcArray = Array.from(array).map(img => img.src); return imgSrcArray;",
      storage: { cookies: [] },
    });
    console.log();
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
          .addPathComponent("api")
          .addPathComponent("series")
          .addPathComponent("filters")
          .buildUrl(),
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
    console.log("search tag soup");
    try {
      const request = {
        url: new URLBuilder(AS_API_DOMAIN)
          .addPathComponent("api")
          .addPathComponent("series")
          .addPathComponent("filters")
          .buildUrl(),
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
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page: number = metadata?.page ?? 1;

    let urlBuilder: URLBuilder = new URLBuilder(AS_DOMAIN)
      .addPathComponent("series")
      .addQueryParameter("page", page.toString());

    if (query?.title) {
      urlBuilder = urlBuilder.addQueryParameter(
        "name",
        encodeURIComponent(query?.title.replace(/[’‘´`'-][a-z]*/g, "%") ?? ""),
      );
    }
    const includedTags = [];
    for (const filter of query.filters) {
      const tags = (filter.value ?? {}) as Record<
        string,
        "included" | "excluded"
      >;
      for (const tag of Object.entries(tags)) {
        includedTags.push(tag[0]);
      }
    }

    urlBuilder = urlBuilder
      .addQueryParameter(
        "genres",
        getFilterTagsBySection("genres", includedTags),
      )
      .addQueryParameter(
        "status",
        getFilterTagsBySection("status", includedTags),
      )
      .addQueryParameter("types", getFilterTagsBySection("type", includedTags))
      .addQueryParameter(
        "order",
        getFilterTagsBySection("order", includedTags),
      );

    const response = await Application.scheduleRequest({
      url: urlBuilder.buildUrl(),
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

export const AsuraScans = new AsuraScansExtension();
