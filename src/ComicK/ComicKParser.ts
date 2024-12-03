import {
  Chapter,
  ChapterDetails,
  ContentRating,
  DiscoverSectionItem,
  DiscoverSectionType,
  MangaInfo,
  SearchResultItem,
  SourceManga,
  Tag,
  TagSection,
} from "@paperback/types";
import { getLanguageName } from "./utils/language";

export const parseMangaDetails = (
  data: ComicK.MangaDetails,
  mangaId: string,
): SourceManga => {
  const countryMap: Record<string, string> = {
    kr: "Manhwa",
    jp: "Manga",
    cn: "Manhua",
  };

  const statusMap: Record<number, string> = {
    1: "ONGOING",
    2: "COMPLETED",
  };

  const { comic, authors, artists } = data;

  const titles: string[] = [
    comic.title,
    ...comic.md_titles.map((titleObj) => titleObj.title),
  ];

  const tags: Tag[] = [];

  const countryTitle = countryMap[comic.country];
  if (countryTitle) {
    tags.push({
      id: `type.${comic.country}`,
      title: countryTitle,
    });
  }

  tags.push(
    ...comic.md_comic_md_genres
      .filter((genre) => genre.md_genres?.slug && genre.md_genres?.name)
      .map((genre) => ({
        id: genre.md_genres.slug,
        title: genre.md_genres.name,
      })),
  );

  const mangaInfo: MangaInfo = {
    thumbnailUrl: comic.cover_url,
    synopsis: comic.desc ? Application.decodeHTMLEntities(comic.desc) : "",
    primaryTitle: titles[0],
    secondaryTitles: titles,
    contentRating: parseContentRating(
      comic.content_rating,
      comic.matureContent,
    ),
    status: statusMap[comic.status] ?? "ONGOING",
    author: authors.map((author: ComicK.Item) => author.name).join(","),
    artist: artists.map((artists: ComicK.Item) => artists.name).join(","),
    tagGroups: [
      {
        id: "0",
        title: "genres",
        tags: tags,
      },
    ],
  };

  return {
    mangaId,
    mangaInfo,
  };
};

export function parseChapters(
  data: ComicK.ChapterList,
  sourceManga: SourceManga,
  filter: ComicK.ChapterFilter,
): Chapter[] {
  const chaptersData = filterChapters(data.chapters, filter);

  return chaptersData.map((chapter) => {
    const chapNum = Number(chapter.chap);
    const volume = Number(chapter.vol);
    const groups = chapter.group_name ?? [];

    return {
      chapterId: chapter.hid,
      sourceManga,
      title: formatChapterTitle(chapter, filter.showTitle),
      chapNum,
      volume: filter.showVol && !isNaN(volume) ? volume : undefined,
      publishDate: new Date(chapter.created_at),
      version: groups.join(","),
      langCode: getLanguageName(chapter.lang),
    };
  });
}

export const parseChapterDetails = (
  data: ComicK.ChapterImages,
  chapter: Chapter,
): ChapterDetails => ({
  id: chapter.chapterId,
  mangaId: chapter.sourceManga.mangaId,
  pages: data.chapter.images
    .filter((image) => image.url)
    .map((image) => image.url),
});

export function parseTags(data: ComicK.Item[]): TagSection[] {
  const tags = data
    .filter((tag) => tag.slug && tag.name)
    .map((tag) => ({
      id: tag.slug,
      title: tag.name,
    }));

  return [
    {
      id: "genres",
      title: "Genres",
      tags,
    },
  ];
}

export function parseSearch(data: ComicK.SearchData[]): SearchResultItem[] {
  return data
    .filter((manga) => manga.hid)
    .map((manga) => ({
      imageUrl: manga.cover_url,
      title: Application.decodeHTMLEntities(manga.title),
      mangaId: manga.hid,
      subtitle: Application.decodeHTMLEntities(
        manga.last_chapter ? `Chapter ${manga.last_chapter}` : manga.title,
      ),
    }));
}

export function parseDiscoverSection(
  data: ComicK.SearchData[],
  type: DiscoverSectionType,
): DiscoverSectionItem[] {
  return data
    .filter((manga) => manga.hid)
    .map((manga) => {
      const baseItem = {
        imageUrl: manga.cover_url,
        title: Application.decodeHTMLEntities(manga.title),
        mangaId: manga.hid,
      };

      switch (type) {
        case DiscoverSectionType.featured:
          return { ...baseItem, type: "featuredCarouselItem" };
        case DiscoverSectionType.prominentCarousel:
          return { ...baseItem, type: "prominentCarouselItem" };
        case DiscoverSectionType.simpleCarousel:
          return {
            ...baseItem,
            subtitle: Application.decodeHTMLEntities(
              manga.last_chapter
                ? `Chapter ${manga.last_chapter}`
                : manga.title,
            ),
            type: "simpleCarouselItem",
          };
        default:
          throw new Error(`Unknown discover section type: ${type}`);
      }
    });
}

export function parseSortFilter() {
  return [
    { id: "follow", value: "Most follows" },
    { id: "view", value: "Most views" },
    { id: "rating", value: "High rating" },
    { id: "uploaded", value: "Last updated" },
  ];
}

export function parseDemographicFilters() {
  return [
    { id: "1", value: "Shonen" },
    { id: "2", value: "Shoujo" },
    { id: "3", value: "Seinen" },
    { id: "4", value: "Josei" },
  ];
}

export function parseTypeFilters() {
  return [
    { id: "user", value: "User" },
    { id: "author", value: "Author" },
    { id: "group", value: "Group" },
    { id: "comic", value: "Comic" },
  ];
}

export function parseCreatedAtFilters() {
  return [
    { id: "30", value: "30 days" },
    { id: "90", value: "3 months" },
    { id: "180", value: "6 months" },
    { id: "365", value: "1 year" },
  ];
}

function parseContentRating(
  content_rating: "safe" | "erotica",
  matureContent: boolean,
): ContentRating {
  if (content_rating === "erotica") {
    return ContentRating.ADULT;
  }

  if (content_rating === "safe" && matureContent) {
    return ContentRating.MATURE;
  }

  return ContentRating.EVERYONE;
}

function filterChapters(
  chapters: ComicK.ChapterData[],
  filter: ComicK.ChapterFilter,
): ComicK.ChapterData[] {
  if (filter.hideUnreleasedChapters) {
    const currentDate = new Date();
    chapters = chapters.filter(
      (chapter) => new Date(chapter.publish_at) <= currentDate,
    );
  }

  if (filter.chapterScoreFiltering) {
    return filterByScore(chapters);
  }

  if (filter.uploadersToggled && filter.uploaders.length) {
    return filterByUploaders(chapters, filter);
  }

  return chapters;
}

function filterByScore(chapters: ComicK.ChapterData[]): ComicK.ChapterData[] {
  const chapterMap = new Map<
    number,
    { score: number; chapter: ComicK.ChapterData }
  >();

  chapters.forEach((chapter) => {
    const chapNum = Number(chapter.chap);
    const score = chapter.up_count - chapter.down_count;
    const existing = chapterMap.get(chapNum);

    if (!existing || score > existing.score) {
      chapterMap.set(chapNum, { score, chapter });
    }
  });

  return Array.from(chapterMap.values()).map((v) => v.chapter);
}

function filterByUploaders(
  chapters: ComicK.ChapterData[],
  filter: ComicK.ChapterFilter,
): ComicK.ChapterData[] {
  const {
    uploaders,
    uploadersWhitelisted,
    aggressiveUploadersFilter,
    strictNameMatching,
  } = filter;

  return chapters.filter((chapter) => {
    const groups = chapter.group_name ?? [];
    const matchesUploader = (group: string, uploader: string) =>
      strictNameMatching
        ? uploader === group
        : group.toLowerCase().includes(uploader.toLowerCase());

    const hasMatchingUploader = groups.some((group) =>
      uploaders.some((uploader) => matchesUploader(group, uploader)),
    );

    const hasAllUploaders = groups.every((group) =>
      uploaders.some((uploader) => matchesUploader(group, uploader)),
    );

    if (aggressiveUploadersFilter) {
      return uploadersWhitelisted ? hasAllUploaders : !hasMatchingUploader;
    }

    return uploadersWhitelisted ? hasMatchingUploader : !hasAllUploaders;
  });
}

function formatChapterTitle(
  chapter: ComicK.ChapterData,
  showTitle: boolean,
): string {
  return showTitle && chapter.title ? `${chapter.title}` : "";
}
