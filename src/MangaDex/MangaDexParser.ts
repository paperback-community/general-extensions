import { ContentRating, SourceManga, Tag } from "@paperback/types";
import { MangaItem } from "./interfaces/MangaDexInterface";
import { MDImageQuality } from "./MangaDexHelper";
import { getMangaThumbnail } from "./MangaDexSettings";

type MangaItemWithAdditionalInfo = MangaItem & {
  mangaId: string;
  title: string;
  imageUrl: string;
  subtitle?: string;
};

export const parseMangaList = async (
  object: MangaItem[],
  COVER_BASE_URL: string,
  thumbnailSelector: () => string,
): Promise<MangaItemWithAdditionalInfo[]> => {
  const results: MangaItemWithAdditionalInfo[] = [];

  for (const manga of object) {
    const mangaId = manga.id;
    const mangaDetails = manga.attributes;
    const title = Application.decodeHTMLEntities(
      mangaDetails.title.en ??
        mangaDetails.altTitles
          .map((x) => Object.values(x).find((v) => v !== undefined))
          .find((t) => t !== undefined),
    );
    const coverFileName = manga.relationships
      .filter((x) => x.type == "cover_art")
      .map((x) => x.attributes?.fileName)[0];
    const image = coverFileName
      ? `${COVER_BASE_URL}/${mangaId}/${coverFileName}${MDImageQuality.getEnding(thumbnailSelector())}`
      : "https://mangadex.org/_nuxt/img/cover-placeholder.d12c3c5.jpg";
    const subtitle = parseChapterTitle({
      title: undefined,
      volume: mangaDetails.lastVolume,
      chapter: mangaDetails.lastChapter,
    });

    results.push({
      ...manga,
      mangaId: mangaId,
      title: title,
      imageUrl: image,
      subtitle: subtitle,
    });
  }

  return results;
};

export const parseMangaDetails = (
  mangaId: string,
  COVER_BASE_URL: string,
  json: any,
): SourceManga => {
  const mangaDetails = json.data.attributes;

  const secondaryTitles: string[] = mangaDetails.altTitles
    .flatMap((x: any) => Object.values(x))
    .map((x: string) => Application.decodeHTMLEntities(x));
  const primaryTitle: string =
    mangaDetails.title["en"] ?? Object.values(mangaDetails.title)[0];
  const desc = Application.decodeHTMLEntities(
    mangaDetails.description.en,
  )?.replace(/\[\/?[bus]]/g, ""); // Get rid of BBcode tags

  const status = mangaDetails.status;

  const tags: Tag[] = [];
  for (const tag of mangaDetails.tags) {
    const tagName: { [index: string]: string } = tag.attributes.name;
    tags.push({
      id: tag.id,
      title: Object.keys(tagName).map((keys) => tagName[keys])[0] ?? "Unknown",
    });
  }

  const author = json.data.relationships
    .filter((x: any) => x.type == "author")
    .map((x: any) => x.attributes.name)
    .join(", ");
  const artist = json.data.relationships
    .filter((x: any) => x.type == "artist")
    .map((x: any) => x.attributes.name)
    .join(", ");

  let image = "";
  const coverFileName = json.data.relationships
    .filter((x: any) => x.type == "cover_art")
    .map((x: any) => x.attributes?.fileName)[0];
  if (coverFileName) {
    image = `${COVER_BASE_URL}/${mangaId}/${coverFileName}${MDImageQuality.getEnding(getMangaThumbnail())}`;
  }

  return {
    mangaId: mangaId,
    mangaInfo: {
      primaryTitle: primaryTitle,
      secondaryTitles: secondaryTitles,
      thumbnailUrl: image,
      author,
      artist,
      synopsis: desc ?? "No Description",
      status,
      tagGroups: [{ id: "tags", title: "Tags", tags: tags }],
      contentRating: ContentRating.EVERYONE, // TODO: apply proper rating
    },
  };
};

export const parseChapterTitle = (info: {
  title?: string;
  volume?: string;
  chapter?: string;
}): string => {
  if (!info) {
    return "Not found";
  }

  return `${info.volume ? `Vol. ${info.volume}` : ""} ${info.chapter ? `Ch. ${info.chapter}` : ""} ${info.title ? info.title : ""}`.trim();
};
