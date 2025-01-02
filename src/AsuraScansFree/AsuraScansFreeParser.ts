import {
  Chapter,
  ChapterDetails,
  ContentRating,
  DiscoverSectionItem,
  SearchResultItem,
  SourceManga,
} from "@paperback/types";
import { CheerioAPI, load } from "cheerio";

export const parseMangaDetails = async (
  $: CheerioAPI,
  mangaId: string,
): Promise<SourceManga> => {
  const title = $(".entry-title").text().trim() ?? "";
  const image = $("div.thumb img").attr("src") ?? "";
  const description = $("div.entry-content-single p").text().trim() ?? "";

  const author = $('h3:contains("Author")').next().text().trim() ?? "";
  const artist = $('h3:contains("Author")').next().text().trim() ?? "";

  const rawStatus = $('h3:contains("Status")').next().text().trim() ?? "";
  let status = "ONGOING";
  switch (rawStatus.toUpperCase()) {
    case "ONGOING":
      status = "Ongoing";
      break;
    case "COMPLETED":
      status = "Completed";
      break;
    case "HIATUS":
      status = "Hiatus";
      break;
    case "SEASON END":
      status = "Season End";
      break;
    case "COMING SOON":
      status = "Coming Soon";
      break;
    default:
      status = "Ongoing";
      break;
  }

  const titles = [load(title).text()];

  return {
    mangaId: mangaId,
    mangaInfo: {
      primaryTitle: titles.shift() as string,
      secondaryTitles: titles,
      status: status,
      author: load(author).text(),
      artist: load(artist).text(),
      synopsis: load(description).text(),
      thumbnailUrl: image,
      contentRating: ContentRating.EVERYONE,
    },
  };
};

export const parseChapters = (
  $: CheerioAPI,
  sourceManga: SourceManga,
): Chapter[] => {
  const chapters: Chapter[] = [];
  let sortingIndex = 0;

  for (const chapter of $("div.chbox", "div#chapterlist").toArray()) {
    const id =
      $("a", chapter)
        .attr("href")
        ?.replace(/\/$/, "")
        ?.split("chapter-")
        .pop()
        ?.trim() ?? "";

    if (!id || isNaN(Number(id))) continue;

    const rawDate = $("span.chapterdate", chapter).last().text().trim() ?? "";
    const date = new Date(rawDate.replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1"));

    chapters.push({
      chapterId: id,
      title: `Chapter ${id}`,
      langCode: "🇬🇧",
      chapNum: Number(id),
      volume: 0,
      publishDate: date,
      sortingIndex,
      sourceManga,
    });
    sortingIndex--;
  }

  if (chapters.length == 0) {
    throw new Error(
      `Couldn't find any chapters for mangaId: ${sourceManga.mangaId}!`,
    );
  }

  return chapters.map((chapter) => {
    if (chapter.sortingIndex != undefined)
      chapter.sortingIndex += chapters.length;
    return chapter;
  });
};

export const parseChapterDetails = async (
  $: CheerioAPI,
  mangaId: string,
  chapterId: string,
): Promise<ChapterDetails> => {
  const pages: string[] = [];

  //@ts-expect-error Ignore index
  const readerScript = $("script").filter((i, el) => {
    return $(el).html()?.includes("ts_reader.run");
  });

  if (!readerScript) {
    throw new Error(`Failed to find page details script for manga ${mangaId}`); // If null, throw error, else parse data to json.
  }

  const scriptMatch = readerScript
    .html()
    ?.match(/ts_reader\.run\((.*?(?=\);|},))/);

  interface obj {
    sources: {
      images: string[];
    }[];
  }

  let scriptStr: string = "";
  let scriptObj: obj = {
    sources: [],
  };

  if (scriptMatch && scriptMatch[1]) {
    scriptStr = scriptMatch[1];
  }

  if (!scriptStr) {
    throw new Error(`Failed to parse script for manga ${mangaId}`); // If null, throw error, else parse data to json.
  }

  if (!scriptStr.endsWith("}")) {
    scriptStr = scriptStr + "}";
  }

  scriptObj = JSON.parse(scriptStr) as obj;
  console.log(typeof scriptObj);
  console.log(Object.keys(scriptObj));

  if (!scriptObj?.sources) {
    throw new Error(`Failed for find sources property for manga ${mangaId}`);
  }

  for (const index of scriptObj.sources) {
    // Check all sources, if empty continue.
    if (index?.images.length == 0) continue;
    index.images.map((p: string) => pages.push(encodeURI(p.trim())));
  }

  const chapterDetails = {
    id: chapterId,
    mangaId: mangaId,
    pages: pages,
  };

  return chapterDetails;
};

export const parseFeaturedSection = async (
  $: CheerioAPI,
): Promise<DiscoverSectionItem[]> => {
  // Featured
  const featuredSection_Array: DiscoverSectionItem[] = [];
  for (const manga of $("a", "div.popconslide").toArray()) {
    const slug =
      $(manga).attr("href")?.replace(/\/$/, "")?.split("/").pop() ?? "";
    if (!slug) continue;

    // Fix ID later, remove hash
    const image: string = $("img", manga).first().attr("src") ?? "";
    const title: string = $("div.tt", manga).first().text().trim() ?? "";

    if (!slug || !title) continue;
    featuredSection_Array.push({
      imageUrl: image,
      title: load(title).text(),
      mangaId: slug,
      type: "featuredCarouselItem",
    });
  }
  return featuredSection_Array;
};

export const parseUpdateSection = async (
  $: CheerioAPI,
): Promise<DiscoverSectionItem[]> => {
  // Latest Updates
  const updateSectionArray: DiscoverSectionItem[] = [];
  for (const item of $("a", "div.bsx").toArray()) {
    const slug =
      $(item).attr("href")?.replace(/\/$/, "")?.split("/").pop() ?? "";
    if (!slug) continue;

    const image: string = $("img", item).first().attr("src") ?? "";
    const title: string = $("div.tt", item).first().text().trim() ?? "";
    const subtitle: string = $("div.epxs", item).text().trim() ?? "";

    updateSectionArray.push({
      imageUrl: image,
      title: load(title).text(),
      mangaId: slug,
      subtitle: subtitle,
      type: "simpleCarouselItem",
    });
  }

  return updateSectionArray;
};

export const parsePopularSection = async (
  $: CheerioAPI,
): Promise<DiscoverSectionItem[]> => {
  // Popular Today
  const popularSection_Array: DiscoverSectionItem[] = [];
  for (const manga of $("a", "div.bsx").toArray()) {
    const slug =
      $(manga).attr("href")?.replace(/\/$/, "")?.split("/").pop() ?? "";
    if (!slug) continue;

    const image: string = $("img", manga).first().attr("src") ?? "";
    const title: string =
      $("span.block.font-bold", manga).first().text().trim() ?? "";
    const subtitle: string =
      $("span.block.font-bold", manga).first().next().text().trim() ?? "";

    if (!slug || !title) continue;
    popularSection_Array.push({
      imageUrl: image,
      title: load(title).text(),
      chapterId: load(subtitle).text(),
      mangaId: slug,
      type: "chapterUpdatesCarouselItem",
    });
  }
  return popularSection_Array;
};

export const parseSearch = async (
  $: CheerioAPI,
): Promise<SearchResultItem[]> => {
  const collectedIds: string[] = [];
  const itemArray: SearchResultItem[] = [];

  for (const item of $("a", "div.listupd").toArray()) {
    const slug =
      $(item).attr("href")?.replace(/\/$/, "")?.split("/").pop() ?? "";
    if (!slug) continue;

    const id = slug;

    const image: string = $("img", item).first().attr("src") ?? "";
    const title: string = $("div.tt", item).first().text().trim() ?? "";
    const subtitle: string = $("div.epxs", item).text().trim() ?? "";

    itemArray.push({
      imageUrl: image,
      title: load(title).text(),
      mangaId: id,
      subtitle: subtitle,
    });

    collectedIds.push(id);
  }

  return itemArray;
};

export const isLastPage = ($: CheerioAPI): boolean => {
  let isLast = true;
  const hasItems = $("a.next", ".pagination").toArray().length > 0;
  console.log("LastItem: " + $("a.next", ".pagination").toArray().length);

  if (hasItems) isLast = false;
  return isLast;
};
