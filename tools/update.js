// src/tools/update-mgeko-tags.ts
import * as fs from "node:fs/promises";
import * as cheerio from "cheerio";
import { format } from "prettier";

// src/utils/url-builder/base.ts
var URLBuilder = class {
  baseUrl;
  queryParams = {};
  pathSegments = [];
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }
  formatArrayQuery(key, value) {
    return value.length > 0 ? value.map((v) => `${key}[]=${v}`) : [];
  }
  formatObjectQuery(key, value) {
    return Object.entries(value).map(
      ([objKey, objValue]) => objValue !== void 0 ? `${key}[${objKey}]=${objValue}` : void 0
    ).filter((x) => x !== void 0);
  }
  formatQuery(queryParams) {
    return Object.entries(queryParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return this.formatArrayQuery(key, value);
      }
      if (typeof value === "object") {
        return this.formatObjectQuery(key, value);
      }
      return value === "" ? [] : [`${key}=${value}`];
    }).join("&");
  }
  build() {
    const fullPath = this.pathSegments.length > 0 ? `/${this.pathSegments.join("/")}` : "";
    const queryString = this.formatQuery(this.queryParams);
    if (queryString.length > 0)
      return `${this.baseUrl}${fullPath}?${queryString}`;
    return `${this.baseUrl}${fullPath}`;
  }
  addPath(segment) {
    this.pathSegments.push(segment.replace(/^\/+|\/+$/g, ""));
    return this;
  }
  addQuery(key, value) {
    this.queryParams[key] = value;
    return this;
  }
  reset() {
    this.queryParams = {};
    this.pathSegments = [];
    return this;
  }
};

// src/tools/update-mgeko-tags.ts
function parseGenreTags($) {
  const arrayTags = [];
  for (const tag of $(".genre-select-i label").toArray()) {
    const title = $(tag).attr("for") ?? "";
    if (!title) continue;
    arrayTags.push({ id: title, title });
  }
  const tagSections = [
    { id: "genres", title: "genres", tags: arrayTags }
  ];
  return tagSections;
}
async function getGenreTags() {
  const url = new URLBuilder("https://www.mgeko.cc").addPath("browse-comics").build();
  const result = await fetch(url);
  if (result.status != 200) {
    console.error("Mgeko: Fetching of Genre Tags was not successful.");
    return;
  }
  const $ = cheerio.load(await result.text());
  return parseGenreTags($);
}
async function saveMgekoGenreTags() {
  const genreTags = await getGenreTags();
  if (!genreTags) {
    console.error("Mgeko: Genre Tags were not saved.");
    return;
  }
  const formattedGenreTags = await format(JSON.stringify(genreTags), {
    parser: "json"
  });
  await fs.writeFile(
    "./src/Mgeko/external/genre-tags.json",
    formattedGenreTags
  );
}

// src/tools/update-comick-tags.ts
import * as fs2 from "node:fs/promises";
import { format as format2 } from "prettier";

// src/ComicK/ComicKParser.ts
import {
  ContentRating,
  DiscoverSectionType
} from "@paperback/types";

// src/utils/url-builder/array-query-variant.ts
var URLBuilder2 = class extends URLBuilder {
  formatArrayQuery(key, value) {
    return value.length > 0 ? value.map((v) => `${key}=${v}`) : [];
  }
};

// src/ComicK/ComicKParser.ts
function parseTags(data, sectionId, sectionTitle) {
  const tags = data.filter((tag) => tag.slug && tag.name).map((tag) => ({
    id: tag.slug,
    title: tag.name
  }));
  return [
    {
      id: sectionId,
      title: sectionTitle,
      tags
    }
  ];
}

// src/tools/update-comick-tags.ts
async function getGenreTags2() {
  const url = new URLBuilder2("https://api.comick.fun").addPath("genre").addQuery("tachiyomi", "true").build();
  const result = await fetch(url);
  if (result.status != 200) {
    console.error("ComicK: Fetching of Genre Tags was not successful.");
    return [];
  }
  const parsedArray = JSON.parse(await result.text());
  const parsedTags = parseTags(parsedArray, "genres", "Genres");
  return parsedTags;
}
async function saveComicKGenreTags() {
  const genreTags = await getGenreTags2();
  if (!genreTags) {
    console.error("ComicK: Genre Tags were not saved.");
    return;
  }
  const formattedGenreTags = await format2(JSON.stringify(genreTags), {
    parser: "json"
  });
  await fs2.writeFile(
    "./src/ComicK/external/genre-tags.json",
    formattedGenreTags
  );
}

// src/tools/update.ts
var EXTENSIONS = ["mgeko", "mangadex", "comick"];
function isValidExtension(extension) {
  return EXTENSIONS.includes(extension);
}
async function updateExtension(extension) {
  try {
    switch (extension) {
      case "mgeko":
        await saveMgekoGenreTags();
        return true;
      case "mangadex":
        console.error(`${extension}: Update function not implemented`);
        return false;
      case "comick":
        await saveComicKGenreTags();
        return true;
    }
  } catch (error) {
    console.error(`Error updating ${extension}:`, error);
    return false;
  }
}
async function updateAllExtensions() {
  let allSuccessful = true;
  for (const extension of EXTENSIONS) {
    const success = await updateExtension(extension);
    if (!success) {
      allSuccessful = false;
    }
  }
  return allSuccessful;
}
function printUsage() {
  console.log("Usage:");
  console.log("  update <extension>");
  console.log("  update --all");
  console.log("\nAvailable extensions:");
  EXTENSIONS.forEach((ext) => console.log(`  - ${ext}`));
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Please provide an extension or --all flag.");
    printUsage();
    return 1;
  }
  const command = args[0];
  if (command === "--all") {
    console.log("Updating all extensions...");
    const success = await updateAllExtensions();
    return success ? 0 : 1;
  } else if (isValidExtension(command)) {
    console.log(`Updating extension: ${command}`);
    const success = await updateExtension(command);
    return success ? 0 : 1;
  } else {
    console.error(`Unknown extension: ${command}`);
    printUsage();
    return 1;
  }
}
main().then((exitCode) => {
  console.log("Finished updating.");
  process.exit(exitCode);
}).catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
