import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "Weeb Central",
  description: "The weebcentral.com extension.",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.MATURE,
  badges: [],
  capabilities:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.DISCOVER_SECIONS |
    SourceIntents.MANGA_SEARCH,
  developers: [
    {
      name: "Paperback Community",
      website: "https://github.com/paperback-community",
    },
  ],
} satisfies SourceInfo;
