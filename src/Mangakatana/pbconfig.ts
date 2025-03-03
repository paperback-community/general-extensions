import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "Mangakatana",
  description: "Mangakatana extension",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.EVERYONE,
  badges: [
    {
      label: "Content Providing",
      textColor: "#FFFFFF",
      backgroundColor: "#FF0000",
    },
    {
      label: "English",
      textColor: "#000000",
      backgroundColor: "#00ffff",
    },
    {
      label: "Manga",
      textColor: "#FFFFFF",
      backgroundColor: "#C71585",
    },
    {
      label: "Webtoon",
      textColor: "#FFFFFF",
      backgroundColor: "#C71585",
    },
  ],
  capabilities: [
    SourceIntents.SETTINGS_UI,
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.MANGA_CHAPTERS,
  ],
  developers: [
    {
      name: "Egwau",
    },
  ],
} satisfies SourceInfo;
