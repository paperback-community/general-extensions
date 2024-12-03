import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionProviding,
  DiscoverSectionType,
  EndOfPageResults,
  Extension,
  Form,
  MangaProviding,
  PagedResults,
  PaperbackInterceptor,
  Request,
  Response,
  SearchQuery,
  SearchResultItem,
  SearchResultsProviding,
  SettingsFormProviding,
  SourceManga,
  TagSection,
} from "@paperback/types";
import { URLBuilder } from "../utils/url-builder";
import {
  parseChapterDetails,
  parseChapters,
  parseCreatedAtFilters,
  parseDemographicFilters,
  parseDiscoverSection,
  parseMangaDetails,
  parseSearch,
  parseSortFilter,
  parseTags,
  parseTypeFilters,
} from "./ComicKParser";
import {
  ComicKSettingsForm,
  getAggresiveUploadersFiltering,
  getChapterScoreFiltering,
  getHideUnreleasedChapters,
  getLanguages,
  getShowTitle,
  getShowVolumeNumber,
  getStrictNameMatching,
  getUploaders,
  getUploadersFiltering,
  getUploadersWhitelisted,
} from "./ComicKSettings";

const COMICK_DOMAIN = "https://comick.io";
const COMICK_API = "https://api.comick.fun";
const LIMIT = 60;

type ComicKImplementation = Extension &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding &
  SettingsFormProviding &
  DiscoverSectionProviding;

class ComicKInterceptor extends PaperbackInterceptor {
  async interceptRequest(request: Request): Promise<Request> {
    request.headers = {
      ...(request.headers ?? {}),
      ...{
        referer: COMICK_DOMAIN,
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

export class ComicKExtension implements ComicKImplementation {
  globalRateLimiter = new BasicRateLimiter("rateLimiter", {
    numberOfRequests: 4,
    bufferInterval: 1,
    ignoreImages: true,
  });

  mainRequestInterceptor = new ComicKInterceptor("main");

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.mainRequestInterceptor.registerInterceptor();

    const sortFilters = parseSortFilter();

    Application.registerSearchFilter({
      id: "sort",
      type: "dropdown",
      options: sortFilters,
      value: "",
      title: "Sort",
    });

    const demographicFilters = parseDemographicFilters();

    Application.registerSearchFilter({
      type: "multiselect",
      options: demographicFilters,
      id: "demographic",
      allowExclusion: false,
      title: "Demographic",
      value: {},
      allowEmptySelection: true,
      maximum: undefined,
    });

    const typeFilters = parseTypeFilters();

    Application.registerSearchFilter({
      id: "type",
      type: "dropdown",
      options: typeFilters,
      value: "",
      title: "Type",
    });

    const createdAtFilters = parseCreatedAtFilters();

    Application.registerSearchFilter({
      id: "created-at",
      type: "dropdown",
      options: createdAtFilters,
      value: "",
      title: "Created At",
    });

    try {
      const searchTags = await this.getSearchTags();

      for (const tags of searchTags) {
        Application.registerSearchFilter({
          type: "multiselect",
          options: tags.tags.map((x) => ({ id: x.id, value: x.title })),
          id: "tags-" + tags.id,
          allowExclusion: true,
          title: tags.title,
          value: {},
          allowEmptySelection: false,
          maximum: undefined,
        });
      }
    } catch (e) {
      throw new Error(JSON.stringify(e));
    }
  }

  async getSettingsForm(): Promise<Form> {
    return new ComicKSettingsForm();
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "most_viewed",
        title: "Most Viewed",
        type: DiscoverSectionType.prominentCarousel,
      },
      {
        id: "most_followed",
        title: "Most Followed",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "latest_uploads",
        title: "Latest Uploads",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: ComicK.Metadata,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    switch (section.id) {
      case "most_viewed":
        return this.getDiscoverSectionItemsWrapper(
          section,
          metadata,
          "view",
          20,
        );
      case "most_followed":
        return this.getDiscoverSectionItemsWrapper(
          section,
          metadata,
          "follow",
          20,
        );
      case "latest_uploads":
        return this.getDiscoverSectionItemsWrapper(
          section,
          metadata,
          "uploaded",
          20,
        );
      default:
        return this.getDiscoverSectionItemsWrapper(section, metadata, "", 20);
    }
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const url = new URLBuilder(COMICK_API)
      .path("comic")
      .path(mangaId)
      .query("tachiyomi", "true")
      .build();

    const request: Request = {
      url: url,
      method: "GET",
    };
    const parsedData = await this.fetchApi<ComicK.MangaDetails>(request);

    return parseMangaDetails(parsedData, mangaId);
  }

  async getChapters(
    sourceManga: SourceManga,
    sinceDate?: Date,
  ): Promise<Chapter[]> {
    const chapterFilter = this.getChapterFilter();
    const chapters: Chapter[] = [];
    let limit = 100000;

    // Set lower fetch limit for faster chapter refresh
    if (sinceDate) {
      limit = 60;
    }

    let page = 1;
    let data = await this.createChapterRequest(
      sourceManga.mangaId,
      page++,
      limit,
    );

    const parsedChapters = parseChapters(data, sourceManga, chapterFilter);

    // Check if we already have chapters older than sinceDate
    if (sinceDate) {
      const lastChapter = parsedChapters[parsedChapters.length - 1];
      if (lastChapter?.publishDate && lastChapter.publishDate <= sinceDate) {
        chapters.push(
          ...parsedChapters.filter(
            (c) => c.publishDate && c.publishDate > sinceDate,
          ),
        );
        return chapters;
      }
    }

    chapters.push(...parsedChapters);

    // Try next page if number of chapters is same as limit
    while (data.chapters.length === limit) {
      data = await this.createChapterRequest(
        sourceManga.mangaId,
        page++,
        limit,
      );

      const moreChapters = parseChapters(data, sourceManga, chapterFilter);

      if (sinceDate) {
        const lastChapter = moreChapters[moreChapters.length - 1];
        if (lastChapter?.publishDate && lastChapter.publishDate <= sinceDate) {
          chapters.push(
            ...moreChapters.filter(
              (c) => c.publishDate && c.publishDate > sinceDate,
            ),
          );
          break;
        }
      }

      chapters.push(...moreChapters);
    }

    return chapters;
  }

  async createChapterRequest(
    mangaId: string,
    page: number,
    limit = 100000,
  ): Promise<ComicK.ChapterList> {
    const languages = getLanguages();
    const url = new URLBuilder(COMICK_API)
      .path("comic")
      .path(mangaId)
      .path("chapters")
      .query("page", page.toString())
      .query("limit", limit.toString())
      .query("lang", languages.join(","))
      .query("tachiyomi", "true")
      .build();

    const request: Request = {
      url: url,
      method: "GET",
    };
    const parsedData = await this.fetchApi<ComicK.ChapterList>(request);

    return parsedData;
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const url = new URLBuilder(COMICK_API)
      .path("chapter")
      .path(chapter.chapterId)
      .query("tachiyomi", "true")
      .build();

    const request: Request = {
      url: url,
      method: "GET",
    };
    const parsedData = await this.fetchApi<ComicK.ChapterImages>(request);

    return parseChapterDetails(parsedData, chapter);
  }

  async getSearchTags(): Promise<TagSection[]> {
    const url = new URLBuilder(COMICK_API)
      .path("genre")
      .query("tachiyomi", "true")
      .build();

    const request: Request = {
      url: url,
      method: "GET",
    };
    const parsedData = await this.fetchApi<ComicK.Item[]>(request);

    return parseTags(parsedData);
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: ComicK.Metadata,
  ): Promise<PagedResults<SearchResultItem>> {
    if (metadata?.completed) return EndOfPageResults;

    const page: number = metadata?.page ?? 1;

    const builder = new URLBuilder(COMICK_API)
      .path("v1.0")
      .path("search")
      .query("page", page.toString())
      .query("limit", LIMIT.toString())
      .query("tachiyomi", "true");

    const getFilterValue = (id: string) =>
      query.filters.find((filter) => filter.id === id)?.value;

    const tags = getFilterValue("tags");
    if (tags && typeof tags === "object") {
      const excludes = [];
      const genres = [];

      for (const tag of Object.entries(tags)) {
        switch (tag[1]) {
          case "excluded":
            excludes.push(tag[0]);
            break;
          case "included":
            genres.push(tag[0]);
            break;
        }
      }

      builder.query("excludes", excludes);
      builder.query("genres", genres);
    }

    const sort = getFilterValue("sort");
    if (sort && typeof sort === "string") {
      builder.query("sort", sort);
    }

    const createdAt = getFilterValue("created-at");
    if (createdAt && typeof createdAt === "string") {
      builder.query("time", createdAt);
    }

    const mangaType = getFilterValue("type");
    if (mangaType && typeof mangaType === "string") {
      builder.query("type", mangaType);
    }

    const demographic = getFilterValue("demographic");
    if (demographic && typeof demographic === "object") {
      builder.query("demographic", Object.keys(demographic));
    }

    builder.query("q", query.title.replace(/ /g, "%20"));

    const request: Request = {
      url: builder.build(),
      method: "GET",
    };

    const parsedData = await this.fetchApi<ComicK.SearchData[]>(request);

    const manga = parseSearch(parsedData);
    metadata =
      parsedData.length === LIMIT
        ? { page: page + 1, completed: false }
        : { completed: true };
    const pagedResults: PagedResults<SearchResultItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  async getDiscoverSectionItemsWrapper(
    section: DiscoverSection,
    metadata: ComicK.Metadata,
    sort: string,
    limit: number,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    if (sort.length == 0) {
      return {
        items: [],
        metadata: undefined,
      };
    }

    if (metadata?.completed) return EndOfPageResults;

    const page: number = metadata?.page ?? 1;
    const url = new URLBuilder(COMICK_API)
      .path("v1.0")
      .path("search")
      .query("sort", sort)
      .query("limit", limit.toString())
      .query("page", "1")
      .query("tachiyomi", "true")
      .build();
    const request: Request = {
      url: url,
      method: "GET",
    };
    const parsedData = await this.fetchApi<ComicK.SearchData[]>(request);

    const manga = parseDiscoverSection(parsedData, section.type);
    metadata =
      parsedData.length === LIMIT
        ? { page: page + 1, completed: false }
        : { completed: true };

    const pagedResults: PagedResults<DiscoverSectionItem> = {
      items: manga,
      metadata: metadata,
    };
    return pagedResults;
  }

  getChapterFilter(): ComicK.ChapterFilter {
    return {
      showTitle: getShowTitle(),
      showVol: getShowVolumeNumber(),
      chapterScoreFiltering: getChapterScoreFiltering(),
      uploadersToggled: getUploadersFiltering(),
      uploadersWhitelisted: getUploadersWhitelisted(),
      aggressiveUploadersFilter: getAggresiveUploadersFiltering(),
      strictNameMatching: getStrictNameMatching(),
      uploaders: getUploaders(),
      hideUnreleasedChapters: getHideUnreleasedChapters(),
    };
  }

  async fetchApi<T>(request: Request): Promise<T> {
    try {
      const [, data] = await Application.scheduleRequest(request);
      return JSON.parse(Application.arrayBufferToUTF8String(data)) as T;
    } catch {
      throw new Error(`Failed to fetch data from ${request.url}`);
    }
  }
}

export const ComicK = new ComicKExtension();
