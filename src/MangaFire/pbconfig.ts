import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export default {
  name: "MangaFire",
  description: "Extension that pulls content from mangafire.to.",
  version: "1.1.0",
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
      label: "Aggregator",
      textColor: "#FFFFFF",
      backgroundColor: "#006400",
    },
    {
      label: "Safe",
      textColor: "#000000",
      backgroundColor: "#FFD700",
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
    {
      label: "Fast Release",
      textColor: "#000000",
      backgroundColor: "#00FF00",
    },
    {
      label: "Good Images",
      textColor: "#FFFFFF",
      backgroundColor: "#0000FF",
    },
    {
      label: "Good Translations",
      textColor: "#FFFFFF",
      backgroundColor: "#1E90FF",
    },
  ],
  capabilities: [
    SourceIntents.DISCOVER_SECIONS,
    SourceIntents.MANGA_SEARCH,
    SourceIntents.MANGA_CHAPTERS,
  ],
  developers: [
    {
      name: "Karrot",
    },
    {
      name: "nyzzik",
    },
  ],
} satisfies SourceInfo;
