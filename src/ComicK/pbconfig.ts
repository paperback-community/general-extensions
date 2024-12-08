import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "ComicK",
  version: "1.0.1",
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
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.HOMEPAGE_SECTIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.SETTINGS_UI,
  ],
};
