import { ContentRating, SearchQuery, TagSection } from "@paperback/types";
import { WC_DOMAIN } from "./WeebCentralConfig";
import { TagSectionId } from "./WeebCentralEnums";

export function getFilterTagsBySection(
  section: TagSectionId,
  tags: SearchQuery["filters"],
): string[] {
  const values = tags.find((x) => (x.id as TagSectionId) === section)?.value;
  if (values === undefined) {
    return [];
  }
  return Object.entries(values)
    .filter((x) => x[1] == "included")
    .map((x) => x[0]);
}

export function getTagFromTagStore(
  tagId: TagSectionId,
  tags: TagSection[],
): TagSection {
  const tag = tags.find((x) => (x.id as TagSectionId) === tagId);
  if (tag === undefined) {
    throw new Error(`${tagId} Tag section not found`);
  }
  return tag;
}

export function getShareUrl(mangaId: string): string {
  return `${WC_DOMAIN}/series/${mangaId}`;
}

export function getRating(rating: string): ContentRating {
  return rating === "Yes" ? ContentRating.ADULT : ContentRating.EVERYONE;
}
