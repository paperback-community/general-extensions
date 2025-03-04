import { ContentRating, SearchQuery, SourceManga, Tag } from "@paperback/types";
import { relevanceScore } from "../utils/titleRelevanceScore";
import { MDImageQuality } from "./MangaDexHelper";
import { getMangaThumbnail } from "./MangaDexSettings";

const MANGADEX_DOMAIN = "https://mangadex.org";

type MangaItemWithAdditionalInfo = MangaDex.MangaItem & {
  mangaId: string;
  title: string;
  imageUrl: string;
  subtitle?: string;
};

export const parseMangaList = async (
  object: MangaDex.MangaItem[],
  COVER_BASE_URL: string,
  thumbnailSelector: () => string,
  query?: SearchQuery,
): Promise<MangaItemWithAdditionalInfo[]> => {
  const results: { manga: MangaItemWithAdditionalInfo; relevance: number }[] =
    [];

  const thumbnailQuality = thumbnailSelector();

  for (const manga of object) {
    const mangaId = manga.id;
    const mangaDetails = manga.attributes;
    const title =
      Application.decodeHTMLEntities(
        mangaDetails.title.en ??
          mangaDetails.altTitles
            .flatMap((x: MangaDex.AltTitle) => Object.values(x) as string[])
            .find((t: string | undefined): t is string => t !== undefined),
      ) ?? "Unknown Title";
    const coverFileName = manga.relationships
      .filter(
        (x): x is MangaDex.Relationship => x.type.valueOf() === "cover_art",
      )
      .map((x) => x.attributes?.fileName)[0];
    const image = coverFileName
      ? `${COVER_BASE_URL}/${mangaId}/${coverFileName}${MDImageQuality.getEnding(thumbnailQuality)}`
      : `${MANGADEX_DOMAIN}/_nuxt/img/cover-placeholder.d12c3c5.jpg`;
    const subtitle = parseChapterTitle({
      title: undefined,
      volume: mangaDetails.lastVolume,
      chapter: mangaDetails.lastChapter,
    });

    let relevance = 0;
    if (query?.title) {
      relevance = relevanceScore(title, query.title);
    }

    results.push({
      manga: {
        ...manga,
        mangaId: mangaId,
        title: title,
        imageUrl: image,
        subtitle: subtitle,
      },
      relevance: relevance,
    });
  }

  if (query?.title) {
    results.sort((a, b) => b.relevance - a.relevance);
  }
  return results.map((r) => r.manga);
};

export const parseMangaDetails = (
  mangaId: string,
  COVER_BASE_URL: string,
  json: MangaDex.MangaDetailsResponse,
  ratingJson?: MangaDex.StatisticsResponse,
): SourceManga => {
  const mangaDetails: MangaDex.DatumAttributes = json.data.attributes;

  const secondaryTitles: string[] = mangaDetails.altTitles
    .flatMap((x: MangaDex.AltTitle) => Object.values(x) as string[])
    .map((x: string) => Application.decodeHTMLEntities(x));
  const primaryTitle: string =
    mangaDetails.title.en ?? (Object.values(mangaDetails.title) as string[])[0];
  const desc = Application.decodeHTMLEntities(
    mangaDetails.description.en ?? "",
  )?.replace(/\[\/?[bus]]/g, ""); // Get rid of BBcode tags

  const status = mangaDetails.status;

  const tags: Tag[] = [];
  for (const tag of mangaDetails.tags) {
    const tagName = tag.attributes.name.en;
    tags.push({
      id: tag.id,
      title: tagName ?? "Unknown",
    });
  }

  const author = json.data.relationships
    .filter((x): x is MangaDex.Relationship => x.type.valueOf() === "author")
    .map((x) => x.attributes?.name)
    .filter(Boolean)
    .join(", ");
  const artist = json.data.relationships
    .filter((x): x is MangaDex.Relationship => x.type.valueOf() === "artist")
    .map((x) => x.attributes?.name)
    .filter(Boolean)
    .join(", ");

  let image = "";
  const coverFileName = json.data.relationships
    .filter((x): x is MangaDex.Relationship => x.type.valueOf() === "cover_art")
    .map((x) => x.attributes?.fileName)[0];
  if (coverFileName) {
    image = `${COVER_BASE_URL}/${mangaId}/${coverFileName}${MDImageQuality.getEnding(getMangaThumbnail())}`;
  }

  const rating = ratingJson?.statistics?.[mangaId]?.rating?.average
    ? ratingJson.statistics[mangaId].rating.average / 10
    : undefined;

  return {
    mangaId: mangaId,
    mangaInfo: {
      primaryTitle,
      secondaryTitles,
      thumbnailUrl: image,
      author,
      artist,
      synopsis: desc ?? "No Description",
      status,
      tagGroups: [{ id: "tags", title: "Tags", tags }],
      contentRating: ContentRating.EVERYONE, //TODO: apply proper rating
      shareUrl: `${MANGADEX_DOMAIN}/title/${mangaId}`,
      rating,
    },
  };
};

export function parseChapterTitle(
  attributes: Partial<MangaDex.ChapterAttributes>,
): string {
  const title = attributes.title?.trim() || "";
  const volume = attributes.volume ? `Vol. ${attributes.volume} ` : "";
  const chapter = attributes.chapter ? `Ch. ${attributes.chapter}` : "";
  return `${volume}${chapter}${title ? ` - ${title}` : ""}`.trim();
}
