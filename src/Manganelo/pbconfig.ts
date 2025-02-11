import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "Manganelo",
  description: "A paperback extension for Manganelo.com",
  version: "1.0.0",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.EVERYONE,
  badges: [],
  capabilities: [
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.MANGA_CHAPTERS,
  ],
  developers: [
    {
      name: "Karrot",
    },
  ],
} satisfies SourceInfo;
