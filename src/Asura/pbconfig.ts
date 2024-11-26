import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";
import { getExportVersion } from "./AsuraConfig";

export default {
  name: "Asura Scans",
  description: "The asuracomic.net extension.",
  version: getExportVersion("0.0.0"),
  icon: "icon.png",
  language: "English",
  contentRating: ContentRating.MATURE,
  badges: [],
  capabilities:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.SETTINGS_UI |
    SourceIntents.MANGA_SEARCH |
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
  developers: [
    {
      name: "nyzzik",
      github: "https://github.com/nyzzik",
    },
  ],
} satisfies SourceInfo;
