import { ContentRating } from "@paperback/types";
import { WC_DOMAIN } from "./WeebCentralConfig";

export function getMangaId(slug: string | undefined): string {
  if (!slug) {
    return "";
  }
  const id = slug.split("/series/")[1]?.split("/")[0] ?? "";
  if (id == "") throw new Error("Id is empty");
  return id;
}

export function getShareUrl(mangaId: string): string {
  return `${WC_DOMAIN}/series/${mangaId}`;
}

export function getRating(rating: string): ContentRating {
  return rating === "Yes" ? ContentRating.ADULT : ContentRating.EVERYONE;
}
