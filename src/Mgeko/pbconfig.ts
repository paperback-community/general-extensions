import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "Mgeko",
  version: "1.0.4",
  description:
    "The mgeko.cc (old domains: mcreader.net, manga-raw.club) extension.",
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
