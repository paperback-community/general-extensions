declare namespace MangaDex {
  interface SearchResponse {
    result: string;
    response: string;
    data: MangaItem[];
    limit: number;
    offset: number;
    total: number;
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
    relationships: any[];
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
  }

  enum RelationshipType {
    Artist = "artist",
    Author = "author",
    CoverArt = "cover_art",
    Manga = "manga",
  }

  interface Metadata {
    offset?: number;
    collectedIds?: string[];
  }
}
