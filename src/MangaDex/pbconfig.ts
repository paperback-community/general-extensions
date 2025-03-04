import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "MangaDex",
  version: "1.0.0-alpha.5",
  description: "Extension that pulls titles from mangadex.org.",
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
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.SETTINGS_UI,
  ],
};
