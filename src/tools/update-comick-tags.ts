import * as fs from "node:fs/promises";
import { TagSection } from "@paperback/types";
import { format } from "prettier";
import { parseTags } from "../ComicK/ComicKParser";
import { URLBuilder } from "../utils/url-builder/array-query-variant";

async function getGenreTags(): Promise<TagSection[] | undefined> {
  const url = new URLBuilder("https://api.comick.fun")
    .addPath("genre")
    .addQuery("tachiyomi", "true")
    .build();
  const result = await fetch(url);

  if (result.status != 200) {
    console.error("ComicK: Fetching of Genre Tags was not successful.");
    return [];
  }

  const parsedArray = JSON.parse(await result.text()) as ComicK.Item[];
  const parsedTags = parseTags(parsedArray, "genres", "Genres");

  return parsedTags;
}

export async function saveComicKGenreTags() {
  const genreTags = await getGenreTags();
  if (!genreTags) {
    console.error("ComicK: Genre Tags were not saved.");
    return;
  }

  const formattedGenreTags = await format(JSON.stringify(genreTags), {
    parser: "json",
  });

  await fs.writeFile(
    "./src/ComicK/external/genre-tags.json",
    formattedGenreTags,
  );
}
