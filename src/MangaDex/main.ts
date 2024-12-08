// TODO: Rewrite
import {
  BasicRateLimiter,
  Chapter,
  ChapterDetails,
  ChapterProviding,
  DiscoverSection,
  DiscoverSectionItem,
  DiscoverSectionType,
  Extension,
  Form,
  LibraryItemSourceLinkProposal,
  ManagedCollection,
  ManagedCollectionChangeset,
  ManagedCollectionProviding,
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
  Tag,
  TagSection,
  UpdateManager,
} from "@paperback/types";
import { URLBuilder } from "../utils/url-builder/base";
import tagJSON from "./external/tag.json";
import { MangaDexSearchResponse } from "./interfaces/MangaDexInterface";
import { MDLanguages, requestMetadata } from "./MangaDexHelper";
import {
  parseChapterTitle,
  parseMangaDetails,
  parseMangaList,
} from "./MangaDexParser";
import {
  getAccessToken,
  getDataSaver,
  getForcePort443,
  getHomepageThumbnail,
  getLanguages,
  getRatings,
  getSearchThumbnail,
  getSkipSameChapter,
  MangaDexSettingsForm,
  saveAccessToken,
} from "./MangaDexSettings";

const MANGADEX_DOMAIN = "https://mangadex.org";
const MANGADEX_API = "https://api.mangadex.org";
const COVER_BASE_URL = "https://uploads.mangadex.org/covers";

const SEASONAL_LIST = "77430796-6625-4684-b673-ffae5140f337";

type MangaDexImplementation = Extension &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding &
  SettingsFormProviding &
  ManagedCollectionProviding;

class MangaDexInterceptor extends PaperbackInterceptor {
  private readonly imageRegex = new RegExp(/\.(png|gif|jpeg|jpg|webp)(\?|$)/gi);

  override async interceptRequest(request: Request): Promise<Request> {
    // Impossible to have undefined headers, ensured by the app
    request.headers = {
      ...request.headers,
      referer: `${MANGADEX_DOMAIN}/`,
    };

    let accessToken = getAccessToken();
    if (
      this.imageRegex.test(request.url) ||
      request.url.includes("auth/") ||
      request.url.includes("auth.mangadex") ||
      !accessToken
    ) {
      console.log("skipping auth header");
      return request;
    }
    // Padding 60 secs to make sure it wont expire in-transit if the connection is really bad

    if (Number(accessToken.tokenBody.exp) <= Date.now() / 1000 - 60) {
      try {
        console.log(`access token expired, ${accessToken.tokenBody.exp}`);
        const [response, buffer] = await Application.scheduleRequest({
          url: "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
          method: "post",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: {
            grant_type: "refresh_token",
            refresh_token: accessToken.refreshToken,
            client_id: "thirdparty-oauth-client",
          },
        });

        const data = Application.arrayBufferToUTF8String(buffer);
        const json = JSON.parse(data);

        accessToken = saveAccessToken(json.access_token, json.refresh_token);
        if (!accessToken) {
          console.log("unable to refresh token");
          return request;
        }
      } catch (e) {
        console.log(e);
        return request;
      }
    }

    // Impossible to have undefined headers, ensured by the app
    request.headers = {
      ...request.headers,
      Authorization: "Bearer " + accessToken.accessToken,
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

export class MangaDexExtension implements MangaDexImplementation {
  globalRateLimiter = new BasicRateLimiter("rateLimiter", {
    numberOfRequests: 4,
    bufferInterval: 1,
    ignoreImages: true,
  });
  mainRequestInterceptor = new MangaDexInterceptor("main");

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.mainRequestInterceptor.registerInterceptor();

    if (Application.isResourceLimited) return;

    Application.registerDiscoverSection(
      {
        id: "seasonal",
        title: "Seasonal",
        type: DiscoverSectionType.featured,
      },
      Application.Selector(
        this as MangaDexExtension,
        "getMangaListDiscoverSectionItems",
      ),
    );

    Application.registerDiscoverSection(
      {
        id: "latest_updates",
        title: "Latest Updates",
        type: DiscoverSectionType.chapterUpdates,
      },
      Application.Selector(
        this as MangaDexExtension,
        "getLatestUpdatesDiscoverSectionItems",
      ),
    );

    Application.registerDiscoverSection(
      {
        id: "popular",
        title: "Popular",
        type: DiscoverSectionType.prominentCarousel,
      },
      Application.Selector(
        this as MangaDexExtension,
        "getPopularDiscoverSectionItems",
      ),
    );

    Application.registerDiscoverSection(
      {
        id: "recently_Added",
        title: "Recently Added",
        type: DiscoverSectionType.simpleCarousel,
      },
      Application.Selector(
        this as MangaDexExtension,
        "getRecentlyAddedDiscoverSectionItems",
      ),
    );

    Application.registerSearchFilter({
      id: "includeOperator",
      type: "dropdown",
      options: [
        { id: "AND", value: "AND" },
        { id: "OR", value: "OR" },
      ],
      value: "AND",
      title: "Include Operator",
    });

    Application.registerSearchFilter({
      id: "excludeOperator",
      type: "dropdown",
      options: [
        { id: "AND", value: "AND" },
        { id: "OR", value: "OR" },
      ],
      value: "OR",
      title: "Exclude Operator",
    });

    for (const tags of this.getSearchTags()) {
      Application.registerSearchFilter({
        type: "multiselect",
        options: tags.tags.map((x) => ({ id: x.id, value: x.title })),
        id: "tags-" + tags.id,
        allowExclusion: true,
        title: tags.title,
        value: {},
        allowEmptySelection: true,
        maximum: undefined,
      });

      Application.registerDiscoverSection(
        {
          type: DiscoverSectionType.genres,
          id: tags.id,
          title: tags.title,
          subtitle: undefined,
        },
        Application.Selector(this as MangaDexExtension, "getTags"),
      );
    }
  }

  async processSourceMangaForUpdates(
    updateManager: UpdateManager,
    lastUpdated: Date,
  ): Promise<void> {}

  async getTags(
    section: DiscoverSection,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const sections: Record<string, TagSection> = {};

    for (const tag of tagJSON) {
      const group = tag.data.attributes.group;

      if (sections[group] == null) {
        sections[group] = {
          id: group,
          title: group.charAt(0).toUpperCase() + group.slice(1),
          tags: [],
        };
      }

      const tagObject = {
        id: tag.data.id,
        title: tag.data.attributes.name.en,
      };

      // Since we already know that a section for the group has to exist, eslint is complaining
      // for no reason at all.
      sections[group]!.tags = [...(sections[group]?.tags ?? []), tagObject];
    }

    return {
      items:
        sections[section.id]?.tags.map((x) => ({
          type: "genresCarouselItem",
          searchQuery: {
            title: "",
            filters: [
              { id: `tags-${section.id}`, value: { [x.id]: "included" } },
            ],
          },
          name: x.title,
        })) ?? [],
      metadata: undefined,
    };
  }

  // This will be called for manga that have many new chapters which could not all be fetched in the
  // above method, aka 'high' priority titles
  async getNewChapters(
    sourceManga: SourceManga,
    sinceDate: Date,
  ): Promise<Chapter[]> {
    return this.getChapters(sourceManga);
  }

  async getSettingsForm(): Promise<Form> {
    return new MangaDexSettingsForm();
  }

  getSearchTags(): TagSection[] {
    const sections: Record<string, TagSection> = {};

    for (const tag of tagJSON) {
      const group = tag.data.attributes.group;

      if (sections[group] == null) {
        sections[group] = {
          id: group,
          title: group.charAt(0).toUpperCase() + group.slice(1),
          tags: [],
        };
      }

      const tagObject = {
        id: tag.data.id,
        title: tag.data.attributes.name.en,
      };

      // Since we already know that a section for the group has to exist, eslint is complaining
      // for no reason at all.
      sections[group]!.tags = [...(sections[group]?.tags ?? []), tagObject];
    }

    return Object.values(sections);
  }

  // Used for seasonal listing
  async getCustomListRequestURL(
    listId: string,
    ratings: string[],
  ): Promise<string> {
    const request = {
      url: `${MANGADEX_API}/list/${listId}`,
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);
    const data = Application.arrayBufferToUTF8String(buffer);
    const json = typeof data === "string" ? JSON.parse(data) : data;

    return new URLBuilder(MANGADEX_API)
      .addPath("manga")
      .addQuery("limit", 100)
      .addQuery("contentRating", ratings)
      .addQuery("includes", ["cover_art"])
      .addQuery(
        "ids",
        json.data.relationships
          .filter((x: any) => x.type == "manga")
          .map((x: Tag) => x.id),
      )
      .build();
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    this.checkId(mangaId);

    const request = {
      url: new URLBuilder(MANGADEX_API)
        .addPath("manga")
        .addPath(mangaId)
        .addQuery("includes", ["author", "artist", "cover_art"])
        .build(),
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);
    const data = Application.arrayBufferToUTF8String(buffer);
    console.log(data);
    const json = typeof data === "string" ? JSON.parse(data) : data;
    return parseMangaDetails(mangaId, COVER_BASE_URL, json);
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const mangaId = sourceManga.mangaId;
    this.checkId(mangaId);

    const languages: string[] = getLanguages();
    const skipSameChapter = getSkipSameChapter();
    const ratings: string[] = getRatings();
    const collectedChapters = new Set<string>();
    const chapters: Chapter[] = [];

    let offset = 0;
    let sortingIndex = 0;

    let hasResults = true;
    while (hasResults) {
      const request = {
        url: new URLBuilder(MANGADEX_API)
          .addPath("manga")
          .addPath(mangaId)
          .addPath("feed")
          .addQuery("limit", 500)
          .addQuery("offset", offset)
          .addQuery("includes", ["scanlation_group"])
          .addQuery("translatedLanguage", languages)
          .addQuery("order", {
            volume: "desc",
            chapter: "desc",
            publishAt: "desc",
          })
          .addQuery("contentRating", ratings)
          .addQuery("includeFutureUpdates", "0")
          .build(),
        method: "GET",
      };

      const [_, buffer] = await Application.scheduleRequest(request);
      const data = Application.arrayBufferToUTF8String(buffer);
      const json = typeof data === "string" ? JSON.parse(data) : data;

      offset += 500;

      if (json.data === undefined)
        throw new Error(`Failed to parse json results for ${mangaId}`);

      for (const chapter of json.data) {
        const chapterId = chapter.id;
        const chapterDetails = chapter.attributes;
        const name = Application.decodeHTMLEntities(chapterDetails.title);
        const chapNum = Number(chapterDetails?.chapter);
        const volume = Number(chapterDetails?.volume);
        const langCode: string = MDLanguages.getFlagCode(
          chapterDetails.translatedLanguage,
        );
        const time = new Date(chapterDetails.publishAt);
        const group = chapter.relationships
          .filter((x: any) => x.type == "scanlation_group")
          .map((x: any) => x.attributes.name)
          .join(", ");
        const pages = Number(chapterDetails.pages);
        const identifier = `${volume}-${chapNum}-${chapterDetails.translatedLanguage}`;

        if (collectedChapters.has(identifier) && skipSameChapter) continue;

        if (pages > 0) {
          chapters.push({
            chapterId,
            sourceManga,
            title: name,
            chapNum,
            volume,
            langCode,
            version: group,
            publishDate: time,
            sortingIndex,
          });
          collectedChapters.add(identifier);
          sortingIndex--;
        }
      }

      if (json.total <= offset) {
        hasResults = false;
      }
    }

    if (chapters.length == 0) {
      throw new Error(
        `Couldn't find any chapters in your selected language for mangaId: ${mangaId}!`,
      );
    }

    return chapters.map((chapter) => {
      chapter.sortingIndex = (chapter.sortingIndex ?? 0) + chapters.length;
      return chapter;
    });
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const chapterId = chapter.chapterId;
    const mangaId = chapter.sourceManga.mangaId;

    this.checkId(chapterId); // Check the the mangaId is an old id

    const dataSaver = getDataSaver();
    const forcePort = getForcePort443();

    const request = {
      url: `${MANGADEX_API}/at-home/server/${chapterId}${forcePort ? "?forcePort443=true" : ""}`,
      method: "GET",
    };

    const [_, buffer] = await Application.scheduleRequest(request);
    const data = Application.arrayBufferToUTF8String(buffer);
    const json = typeof data === "string" ? JSON.parse(data) : data;
    const serverUrl = json.baseUrl;
    const chapterDetails = json.chapter;

    let pages: string[];
    if (dataSaver) {
      pages = chapterDetails.dataSaver.map(
        (x: string) => `${serverUrl}/data-saver/${chapterDetails.hash}/${x}`,
      );
    } else {
      pages = chapterDetails.data.map(
        (x: string) => `${serverUrl}/data/${chapterDetails.hash}/${x}`,
      );
    }

    return {
      id: chapterId,
      mangaId: mangaId,
      pages,
    };
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: requestMetadata,
  ): Promise<PagedResults<SearchResultItem>> {
    const ratings: string[] = getRatings();
    const languages: string[] = getLanguages();
    const offset: number = metadata?.offset ?? 0;
    let results: SearchResultItem[] = [];

    const searchType = query.title?.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    )
      ? "ids[]"
      : "title";
    const url = new URLBuilder(MANGADEX_API)
      .addPath("manga")
      .addQuery(searchType, query?.title?.replace(/ /g, "+") || "")
      .addQuery("limit", 100)
      .addQuery("hasAvailableChapters", true)
      .addQuery("availableTranslatedLanguage", languages)
      .addQuery("offset", offset)
      .addQuery("contentRating", ratings)
      .addQuery("includes", ["cover_art"]);

    const includedTags = [];
    const excludedTags = [];
    for (const filter of query.filters) {
      console.log(JSON.stringify(filter));
      if (filter.id.startsWith("tags")) {
        const tags = (filter.value ?? {}) as Record<
          string,
          "included" | "excluded"
        >;
        for (const tag of Object.entries(tags)) {
          switch (tag[1]) {
            case "excluded":
              excludedTags.push(tag[0]);
              break;
            case "included":
              includedTags.push(tag[0]);
              break;
          }
        }
      }

      if (filter.id == "includeOperator") {
        url.addQuery("includedTagsMode", filter.value ?? "and");
      }

      if (filter.id == "excludeOperator") {
        url.addQuery("excludedTagsMode", filter.value ?? "or");
      }
    }

    const request = {
      url: url
        .addQuery("includedTags", includedTags)
        .addQuery("excludedTags", excludedTags)
        .build(),
      method: "GET",
    };
    const [response, buffer] = await Application.scheduleRequest(request);
    const data = Application.arrayBufferToUTF8String(buffer);

    if (response.status != 200) {
      return { items: results };
    }

    const json = typeof data === "string" ? JSON.parse(data) : data;
    if (json.data === undefined) {
      throw new Error("Failed to parse json for the given search");
    }

    results = await parseMangaList(
      json.data,
      COVER_BASE_URL,
      getSearchThumbnail,
    );
    const nextMetadata: requestMetadata | undefined =
      results.length < 100 ? undefined : { offset: offset + 100 };

    return {
      items: results,
      metadata: nextMetadata,
    };
  }

  async getMangaListDiscoverSectionItems(
    section: DiscoverSection,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const ratings: string[] = getRatings();

    const [_, buffer] = await Application.scheduleRequest({
      url: await this.getCustomListRequestURL(SEASONAL_LIST, ratings),
      method: "GET",
    });

    const data = Application.arrayBufferToUTF8String(buffer);
    const json: MangaDexSearchResponse =
      typeof data === "string" ? JSON.parse(data) : data;

    if (json.data === undefined) {
      throw new Error(
        `Failed to parse json results for section ${section.title}`,
      );
    }

    const items = await parseMangaList(
      json.data,
      COVER_BASE_URL,
      getHomepageThumbnail,
    );

    return {
      items: items.map((x) => ({
        type: "featuredCarouselItem",
        imageUrl: x.imageUrl,
        mangaId: x.mangaId,
        title: x.title,
        supertitle: undefined,
        metadata: undefined,
      })),
      metadata: undefined,
    };
  }

  async getPopularDiscoverSectionItems(
    section: DiscoverSection,
    metadata: requestMetadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const offset: number = metadata?.offset ?? 0;
    const collectedIds: string[] = metadata?.collectedIds ?? [];

    const ratings: string[] = getRatings();
    const languages: string[] = getLanguages();

    const [_, buffer] = await Application.scheduleRequest({
      url: new URLBuilder(MANGADEX_API)
        .addPath("manga")
        .addQuery("limit", 100)
        .addQuery("hasAvailableChapters", true)
        .addQuery("availableTranslatedLanguage", languages)
        .addQuery("order", { followedCount: "desc" })
        .addQuery("offset", offset)
        .addQuery("contentRating", ratings)
        .addQuery("includes", ["cover_art"])
        .build(),
      method: "GET",
    });

    const data = Application.arrayBufferToUTF8String(buffer);
    const json: MangaDexSearchResponse =
      typeof data === "string" ? JSON.parse(data) : data;

    if (json.data === undefined) {
      throw new Error(
        `Failed to parse json results for section ${section.title}`,
      );
    }

    const items = await parseMangaList(
      json.data,
      COVER_BASE_URL,
      getHomepageThumbnail,
    );
    const nextMetadata: requestMetadata | undefined =
      items.length < 100 ? undefined : { offset: offset + 100, collectedIds };
    return {
      items: items.map((x) => ({
        ...x,
        type: "prominentCarouselItem",
      })),
      metadata: nextMetadata,
    };
  }

  async getLatestUpdatesDiscoverSectionItems(
    section: DiscoverSection,
    metadata: requestMetadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const offset: number = metadata?.offset ?? 0;
    const collectedIds: string[] = metadata?.collectedIds ?? [];

    const ratings: string[] = getRatings();
    const languages: string[] = getLanguages();

    const [, buffer] = await Application.scheduleRequest({
      url: new URLBuilder(MANGADEX_API)
        .addPath("manga")
        .addQuery("limit", 100)
        .addQuery("hasAvailableChapters", true)
        .addQuery("availableTranslatedLanguage", languages)
        .addQuery("order", { latestUploadedChapter: "desc" })
        .addQuery("offset", offset)
        .addQuery("contentRating", ratings)
        .addQuery("includes", ["cover_art"])
        .build(),
      method: "GET",
    });

    const data = Application.arrayBufferToUTF8String(buffer);
    const json: MangaDexSearchResponse =
      typeof data === "string" ? JSON.parse(data) : data;

    if (json.data === undefined) {
      throw new Error(
        `Failed to parse json results for section ${section.title}`,
      );
    }

    const items = await parseMangaList(
      json.data,
      COVER_BASE_URL,
      getHomepageThumbnail,
    );
    const [, chaptersBuffer] = await Application.scheduleRequest({
      url: new URLBuilder(MANGADEX_API)
        .addPath("chapter")
        .addQuery("limit", 100)
        .addQuery(
          "ids",
          json.data.map((x) => x.attributes.latestUploadedChapter),
        )
        .build(),
      method: "GET",
    });

    const chaptersData = Application.arrayBufferToUTF8String(chaptersBuffer);
    const chapters =
      typeof data === "string" ? JSON.parse(chaptersData) : chaptersData;
    const chapterIdToChapter: Record<string, any> = {};
    for (const chapter of chapters.data) {
      chapterIdToChapter[chapter.id] = chapter;
    }

    const nextMetadata: requestMetadata | undefined =
      items.length < 100 ? undefined : { offset: offset + 100, collectedIds };
    return {
      items: items.map((x) => ({
        chapterId: x.attributes.latestUploadedChapter,
        imageUrl: x.imageUrl,
        mangaId: x.mangaId,
        title: x.title,
        subtitle: parseChapterTitle(
          chapterIdToChapter[x.attributes.latestUploadedChapter]?.attributes,
        ),
        publishDate: new Date(
          chapterIdToChapter[
            x.attributes.latestUploadedChapter
          ]?.attributes.readableAt,
        ),
        type: "chapterUpdatesCarouselItem",
      })),
      metadata: nextMetadata,
    };
  }

  async getRecentlyAddedDiscoverSectionItems(
    section: DiscoverSection,
    metadata: requestMetadata | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const offset: number = metadata?.offset ?? 0;
    const collectedIds: string[] = metadata?.collectedIds ?? [];

    const ratings: string[] = getRatings();
    const languages: string[] = getLanguages();

    const [_, buffer] = await Application.scheduleRequest({
      url: new URLBuilder(MANGADEX_API)
        .addPath("manga")
        .addQuery("limit", 100)
        .addQuery("hasAvailableChapters", true)
        .addQuery("availableTranslatedLanguage", languages)
        .addQuery("order", { createdAt: "desc" })
        .addQuery("offset", offset)
        .addQuery("contentRating", ratings)
        .addQuery("includes", ["cover_art"])
        .build(),
      method: "GET",
    });

    const data = Application.arrayBufferToUTF8String(buffer);
    const json: MangaDexSearchResponse =
      typeof data === "string" ? JSON.parse(data) : data;

    if (json.data === undefined) {
      throw new Error(
        `Failed to parse json results for section ${section.title}`,
      );
    }

    const items = await parseMangaList(
      json.data,
      COVER_BASE_URL,
      getHomepageThumbnail,
    );
    const nextMetadata: requestMetadata | undefined =
      items.length < 100 ? undefined : { offset: offset + 100, collectedIds };
    return {
      items: items.map((x) => ({
        ...x,
        type: "simpleCarouselItem",
      })),
      metadata: nextMetadata,
    };
  }

  async prepareLibraryItems(): Promise<LibraryItemSourceLinkProposal[]> {
    throw new Error("Method not implemented.");
  }

  async getManagedLibraryCollections(): Promise<ManagedCollection[]> {
    return [
      { id: "reading", title: "Reading" },
      { id: "plan_to_read", title: "Planned" },
      { id: "completed", title: "Completed" },
      { id: "dropped", title: "Dropped" },
    ];
  }

  async commitManagedCollectionChanges(
    changeset: ManagedCollectionChangeset,
  ): Promise<void> {
    if (!getAccessToken()) {
      throw new Error("You need to be logged in");
    }

    for (const addition of changeset.additions) {
      await Application.scheduleRequest({
        url: new URLBuilder(MANGADEX_API)
          .addPath("manga")
          .addPath(addition.mangaId)
          .addPath("status")
          .build(),
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          status: changeset.collection.id,
        },
      });
    }

    for (const deletion of changeset.deletions) {
      await Application.scheduleRequest({
        url: new URLBuilder(MANGADEX_API)
          .addPath("manga")
          .addPath(deletion.mangaId)
          .addPath("status")
          .build(),
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: null }),
      });
    }
  }

  async getSourceMangaInManagedCollection(
    managedCollection: ManagedCollection,
  ): Promise<SourceManga[]> {
    if (!getAccessToken()) {
      throw new Error("You need to be logged in");
    }

    const [_, buffer] = await Application.scheduleRequest({
      url: new URLBuilder(MANGADEX_API)
        .addPath("manga")
        .addPath("status")
        .build(),
      method: "get",
    });

    const json = JSON.parse(Application.arrayBufferToUTF8String(buffer));
    if (json.result == "error") {
      throw new Error(JSON.stringify(json.errors));
    }
    const statuses = json["statuses"] as Record<string, string>;
    const ids = Object.keys(statuses).filter(
      (x) => statuses[x] == managedCollection.id,
    );
    console.log(`found ${ids.length} items`);

    let hasResults = true;
    let offset = 0;
    const limit = 100;
    const items = [];
    while (hasResults) {
      const batch = ids.slice(offset, offset + limit);
      console.log(
        `requesting ${offset} to ${offset + limit} items (total: ${batch.length})`,
      );

      const [_, buffer] = await Application.scheduleRequest({
        url: new URLBuilder(MANGADEX_API)
          .addPath("manga")
          .addQuery("ids", batch)
          .addQuery("includes", ["author", "artist", "cover_art"])
          .addQuery("contentRating", [
            "safe",
            "suggestive",
            "erotica",
            "pornographic",
          ])
          .addQuery("limit", limit)
          .build(),
        method: "get",
      });

      const json = JSON.parse(Application.arrayBufferToUTF8String(buffer));
      if (json.result == "error") {
        throw new Error(JSON.stringify(json.errors));
      }

      console.log(`got ${json.data.length} items`);
      for (const item of json.data) {
        console.log(`parsing id ${item.id}`);
        items.push(parseMangaDetails(item.id, COVER_BASE_URL, { data: item }));
      }

      hasResults = batch.length >= limit;
      offset += batch.length;
    }

    return items;
  }

  checkId(id: string): void {
    if (!id.includes("-")) {
      throw new Error("OLD ID: PLEASE REFRESH AND CLEAR ORPHANED CHAPTERS");
    }
  }
}

export const MangaDex = new MangaDexExtension();
