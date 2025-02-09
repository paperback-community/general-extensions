import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "ComicK",
  version: "1.1.0",
  description: "Extension that pulls manga from comick.io.",
  contentRating: ContentRating.MATURE,
  developers: [
    {
      name: "Paperback Community",
      website: "https://github.com/paperback-community",
    },
  ],
  badges: [],
  capabilities: [
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.SETTINGS_UI,
  ],
};
