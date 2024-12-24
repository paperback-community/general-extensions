import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "Asura Scans",
  description: "The asuracomic.net extension.",
  version: "1.1.1",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.MATURE,
  badges: [],
  capabilities:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.SETTINGS_UI |
    SourceIntents.MANGA_SEARCH,
  developers: [
    {
      name: "nyzzik",
      github: "https://github.com/nyzzik",
    },
  ],
} satisfies SourceInfo;
