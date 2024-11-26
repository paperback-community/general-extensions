import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "MangaDex",
  version: "0.9.0",
  description: "The mangadex.org extension.",
  contentRating: ContentRating.MATURE,
  developers: [
    {
      name: "Paperback Community",
      website: "https://github.com/paperback-community",
    },
  ],
  badges: [{ label: "18+", backgroundColor: "#FF0000", textColor: "#FFFFFF" }],
  capabilities: [
    SourceIntents.COLLECTION_MANAGEMENT,
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.MANGA_TRACKING,
    SourceIntents.HOMEPAGE_SECTIONS,
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.SETTINGS_UI,
  ],
};
