import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "MangaKatana",
  description: "Extension that pulls content from mangakatana.com.",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.MATURE,
  badges: [
    {
      label: "Aggregator",
      textColor: "#FFFFFF",
      backgroundColor: "#1d4ed8",
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
    {
      label: "Regular Release",
      textColor: "#000000",
      backgroundColor: "#fbbf24",
    },
    {
      label: "Good Images",
      textColor: "#000000",
      backgroundColor: "#fbbf24",
    },
    {
      label: "Good Translations",
      textColor: "#FFFFFF",
      backgroundColor: "#15803d",
    },
  ],
  capabilities: [
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
