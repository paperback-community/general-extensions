import * as fs from "node:fs/promises";
import { Tag, TagSection } from "@paperback/types";
import * as cheerio from "cheerio";
import { format } from "prettier";
import { URLBuilder } from "../utils/url-builder/base";

function parseGenreTags($: cheerio.CheerioAPI): TagSection[] {
  const arrayTags: Tag[] = [];
  for (const tag of $(".genre-select-i label").toArray()) {
    const title = $(tag).attr("for") ?? "";

    if (!title) continue;
    arrayTags.push({ id: title, title: title });
  }

  const tagSections: TagSection[] = [
    { id: "genres", title: "genres", tags: arrayTags },
  ];
  return tagSections;
}

async function getGenreTags(): Promise<TagSection[] | undefined> {
  const url = new URLBuilder("https://www.mgeko.cc")
    .addPath("browse-comics")
    .build();
  const result = await fetch(url);

  if (result.status != 200) {
    console.error("Mgeko: Fetching of Genre Tags was not successful.");
    return;
  }

  const $ = cheerio.load(await result.text());
  return parseGenreTags($);
}

export async function saveMgekoGenreTags() {
  const genreTags = await getGenreTags();
  if (!genreTags) {
    console.error("Mgeko: Genre Tags were not saved.");
    return;
  }

  const formattedGenreTags = await format(JSON.stringify(genreTags), {
    parser: "json",
  });

  await fs.writeFile(
    "./src/Mgeko/external/genre-tags.json",
    formattedGenreTags,
  );
}
