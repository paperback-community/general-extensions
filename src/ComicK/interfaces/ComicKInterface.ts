type Nullable<T> = T | null;

export interface Item {
  name: string;
  slug: string;
}

export interface Comic {
  title: string;
  status: number;
  hentai: boolean;
  desc: string;
  slug: string;
  country: string;
  md_titles: { title: string }[];
  cover_url: string;
  md_comic_md_genres: { md_genres: Item }[];
}

export interface MangaDetails {
  comic: Comic;
  artists: Item[];
  authors: Item[];
}

export interface ChapterData {
  id: number;
  chap: Nullable<string>;
  title: Nullable<string>;
  vol: Nullable<string>;
  slug: Nullable<string>;
  lang: string;
  created_at: Date;
  updated_at: Date;
  publish_at: Date;
  up_count: number;
  down_count: number;
  group_name: Nullable<string[]>;
  hid: string;
  md_groups: {
    slug: string;
    title: string;
  }[];
}

export interface ChapterList {
  chapters: ChapterData[];
  total: number;
}

export interface ChapterImages {
  chapter: {
    images: { url: string }[];
  };
}

export interface SearchData {
  hid: string;
  title: string;
  cover_url: string;
  last_chapter: string;
  updated_at?: Date;
  md_comics: {
    cover_url: string;
    title: string;
    hid: string;
    last_chapter: string;
  };
}

export interface ChapterFilter {
  aggressiveUploadersFilter: boolean;
  chapterScoreFiltering: boolean;
  hideUnreleasedChapters: boolean;
  showTitle: boolean;
  showVol: boolean;
  strictNameMatching: boolean;
  uploaders: string[];
  uploadersToggled: boolean;
  uploadersWhitelisted: boolean;
}
