declare namespace MangaDex {
  interface SearchResponse {
    result: string;
    response: string;
    data: MangaItem[];
    limit: number;
    offset: number;
    total: number;
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface MangaItem {
    id: string;
    type: RelationshipType;
    attributes: DatumAttributes;
    relationships: Relationship[];
  }

  interface DatumAttributes {
    title: Title;
    altTitles: AltTitle[];
    description: PurpleDescription;
    isLocked: boolean;
    links: Links;
    originalLanguage: OriginalLanguage;
    lastVolume: string;
    lastChapter: string;
    publicationDemographic: null | string;
    status: Status;
    year: number | null;
    contentRating: ContentRating;
    tags: Tag[];
    state: State;
    chapterNumbersResetOnNewVolume: boolean;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    availableTranslatedLanguages: string[];
    latestUploadedChapter: string;
  }

  interface AltTitle {
    ko?: string;
    ja?: string;
    en?: string;
    vi?: string;
    ru?: string;
    th?: string;
    "ko-ro"?: string;
    "ja-ro"?: string;
    uk?: string;
    zh?: string;
    es?: string;
    "zh-ro"?: string;
    ar?: string;
    id?: string;
    "es-la"?: string;
    "pt-br"?: string;
    tr?: string;
    "zh-hk"?: string;
    fr?: string;
    de?: string;
  }

  enum ContentRating {
    Erotica = "erotica",
    Pornographic = "pornographic",
    Safe = "safe",
    Suggestive = "suggestive",
  }

  interface PurpleDescription {
    en?: string;
    "pt-br"?: string;
    id?: string;
    ar?: string;
    fr?: string;
    ru?: string;
    zh?: string;
    "es-la"?: string;
    it?: string;
    ja?: string;
    ko?: string;
    de?: string;
  }

  interface Links {
    mu?: string;
    raw?: string;
    al?: string;
    ap?: string;
    kt?: string;
    nu?: string;
    mal?: string;
    bw?: string;
    amz?: string;
    cdj?: string;
    ebj?: string;
    engtl?: string;
  }

  enum OriginalLanguage {
    En = "en",
    Ja = "ja",
    Ko = "ko",
    Zh = "zh",
  }

  enum State {
    Published = "published",
  }

  enum Status {
    Completed = "completed",
    Ongoing = "ongoing",
  }

  interface Tag {
    id: string;
    type: TagType;
    attributes: TagAttributes;
    relationships: Relationship[];
  }

  interface TagAttributes {
    name: Title;
    description: string;
    group: Group;
    version: number;
  }

  enum Group {
    Content = "content",
    Format = "format",
    Genre = "genre",
    Theme = "theme",
  }

  interface Title {
    en: string;
  }

  enum TagType {
    Tag = "tag",
  }

  interface Relationship {
    id: string;
    type: RelationshipType;
    attributes?: RelationshipAttributes;
    related?: string;
  }

  interface RelationshipAttributes {
    description: string;
    volume: null | string;
    fileName: string;
    locale: OriginalLanguage;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    name?: string;
  }

  enum RelationshipType {
    Artist = "artist",
    Author = "author",
    CoverArt = "cover_art",
    Manga = "manga",
    ScanlationGroup = "scanlation_group",
    User = "user",
  }

  interface Metadata {
    offset?: number;
    collectedIds?: string[];
  }

  interface StatisticsResponse {
    result: string;
    statistics: Record<string, StatisticsData>;
  }

  interface StatisticsData {
    comments: {
      threadId: number;
      repliesCount: number;
    };
    rating: {
      average: number;
      bayesian: number;
      distribution: Record<string, number>;
    };
    follows: number;
  }

  interface CustomListResponse {
    result: string;
    response: string;
    data: MangaItem;
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface MangaDetailsResponse {
    result: string;
    response: string;
    data: MangaItem;
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface ChapterDetailsResponse {
    result: "ok";
    baseUrl: string;
    chapter: {
      hash: string;
      data: string[];
      dataSaver: string[];
    };
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface ChapterRelationship {
    id: string;
    type: string;
    related?: string;
    attributes?: Record<string, unknown>;
  }

  interface ChapterAttributes {
    title: string | null;
    volume: string | null;
    chapter: string | null;
    pages: number;
    translatedLanguage: string;
    uploader?: string;
    externalUrl?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    publishAt: string;
    readableAt: string;
  }

  interface ChapterData {
    id: string;
    type: string;
    attributes: ChapterAttributes;
    relationships: ChapterRelationship[];
  }

  interface ChapterResponse {
    result: string;
    response: string;
    data: ChapterData[];
    limit: number;
    offset: number;
    total: number;
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface MangaStatusResponse {
    result: string;
    statuses: Record<string, string>;
    errors?: [
      {
        id: string;
        status: number;
        title: string;
        detail: string;
        context: string;
      },
    ];
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    session_state: string;
  }

  interface TokenBody {
    exp: number;
    iat: number;
    jti: string;
    iss: string;
    sub: string;
    typ: string;
    azp: string;
    session_state: string;
    allowed_origins: string[];
  }

  interface AccessToken {
    accessToken: string;
    refreshToken?: string;
    tokenBody: TokenBody;
  }

  interface AuthResponse {
    result: string;
    token: {
      session: string;
      refresh: string;
    };
    message: string;
  }

  interface AuthError {
    result: string;
    errors: Array<{
      id: string;
      status: number;
      title: string;
      detail: string;
      context: string;
    }>;
  }
}
