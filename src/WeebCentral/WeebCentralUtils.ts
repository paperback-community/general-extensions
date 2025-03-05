import { ContentRating } from "@paperback/types";
import { WC_DOMAIN } from "./WeebCentralConfig";

export function getShareUrl(mangaId: string): string {
  return `${WC_DOMAIN}/series/${mangaId}`;
}

export function getRating(rating: string): ContentRating {
  return rating === "Yes" ? ContentRating.ADULT : ContentRating.EVERYONE;
}
