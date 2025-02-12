declare namespace Nelo {
  interface Metadata {
    offset?: number;
    collectedIds?: string[];
  }

  interface GenreInfo {
    id: number;
    value: Genre;
  }

  const GenreMap = [
    { id: "2", value: "Action" },
    { id: "3", value: "Adult" },
    { id: "4", value: "Adventure" },
    { id: "6", value: "Comedy" },
    { id: "7", value: "Cooking" },
    { id: "9", value: "Doujinshi" },
    { id: "10", value: "Drama" },
    { id: "11", value: "Ecchi" },
    { id: "48", value: "Erotica" },
    { id: "12", value: "Fantasy" },
    { id: "13", value: "Gender bender" },
    { id: "14", value: "Harem" },
    { id: "15", value: "Historical" },
    { id: "16", value: "Horror" },
    { id: "45", value: "Isekai" },
    { id: "17", value: "Josei" },
    { id: "44", value: "Manhua" },
    { id: "43", value: "Manhwa" },
    { id: "19", value: "Martial arts" },
    { id: "20", value: "Mature" },
    { id: "21", value: "Mecha" },
    { id: "22", value: "Medical" },
    { id: "24", value: "Mystery" },
    { id: "25", value: "One shot" },
    { id: "47", value: "Pornographic" },
    { id: "26", value: "Psychological" },
    { id: "27", value: "Romance" },
    { id: "28", value: "School life" },
    { id: "29", value: "Sci fi" },
    { id: "30", value: "Seinen" },
    { id: "31", value: "Shoujo" },
    { id: "32", value: "Shoujo ai" },
    { id: "33", value: "Shounen" },
    { id: "34", value: "Shounen ai" },
    { id: "35", value: "Slice of life" },
    { id: "36", value: "Smut" },
    { id: "37", value: "Sports" },
    { id: "38", value: "Supernatural" },
    { id: "39", value: "Tragedy" },
    { id: "40", value: "Webtoons" },
    { id: "41", value: "Yaoi" },
    { id: "42", value: "Yuri" },
  ] as const;

  type Genre = keyof typeof GenreMap;
}
