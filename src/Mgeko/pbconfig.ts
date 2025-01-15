import { ContentRating, SourceIntents } from "@paperback/types";

export default {
  icon: "icon.png",
  name: "Mgeko",
  version: "1.0.7",
  description: "The mgeko.cc (old domain: mcreader.net) extension.",
  contentRating: ContentRating.MATURE,
  developers: [
    {
      name: "Paperback Community",
      website: "https://github.com/paperback-community",
    },
  ],
  badges: [],
  capabilities: [
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_CHAPTERS,
    SourceIntents.MANGA_SEARCH,
  ],
};
