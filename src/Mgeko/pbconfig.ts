import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "Mgeko",
  version: "1.0.0",
  description:
    "The mgeko.cc (Old Domains: mcreader.net, Manga-Raw.club) extension.",
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
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
    SourceIntents.MANGA_SEARCH,
  ],
};
