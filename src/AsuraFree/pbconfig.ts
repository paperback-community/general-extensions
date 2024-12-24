import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "Asura Scans Free",
  description: "The asurascansfree.com extension.",
  version: "1.0.1",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.MATURE,
  badges: [],
  capabilities:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.MANGA_SEARCH,
  developers: [
    {
      name: "nyzzik",
      github: "https://github.com/nyzzik",
    },
  ],
} satisfies SourceInfo;
