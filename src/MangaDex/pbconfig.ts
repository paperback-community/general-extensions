import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "MangaDex",
  version: "0.9.1",
  description: "The mangadex.org extension.",
  contentRating: ContentRating.MATURE,
  developers: [
    {
      name: "Paperback Community",
      website: "https://github.com/paperback-community",
    },
  ],
  badges: [],
  capabilities: [
    SourceIntents.COLLECTION_MANAGEMENT,
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.MANGA_TRACKING,
    SourceIntents.HOMEPAGE_SECTIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.SETTINGS_UI,
  ],
};
