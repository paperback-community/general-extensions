import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "MangaPlus",
  version: "0.9.1",
  description: "Extension that pulls manga from Manga+ by Shueisha",
  contentRating: ContentRating.EVERYONE,
  developers: [
    {
      name: "Yves Pa",
      github: "https://github.com/YvesPa",
    },
  ],
  badges: [],
  capabilities: [
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.HOMEPAGE_SECTIONS,
    SourceIntents.SETTINGS_UI,
    SourceIntents.MANGA_SEARCH,
  ],
};
