import { Tag, TagSection } from "@paperback/types";
import { Filters } from "./interfaces/WeebCentralInterfaces";
import { TagSectionId, TagSectionTitle } from "./WeebCentralEnums";

export function getFilterTagsBySection(
  section: TagSectionId,
  tags: string[],
): string[] {
  return tags
    ?.filter((x: string) => x.startsWith(`${section}:`))
    .map((x: string) => {
      return x.replace(`${section}:`, "");
    });
}

export function getTagFromTagStore(
  tagId: TagSectionId,
  tags: TagSection[],
): TagSection {
  const tag = tags.find((x) => (x.id as TagSectionId) === tagId);
  if (tag === undefined) {
    throw new Error(`${tagId} Tag section not found`);
  }
  return tag;
}

export const getTagSection = (filters: Filters): TagSection[] => {
  const tagSections: TagSection[] = [
    {
      id: TagSectionId.Genres,
      title: TagSectionTitle.Genres,
      tags: createTags(filters.genres, TagSectionTitle.Genres),
    },
    {
      id: TagSectionId.SeriesStatus,
      title: TagSectionTitle.SeriesStatus,
      tags: createTags(filters.seriesStatuses, TagSectionTitle.SeriesStatus),
    },
    {
      id: TagSectionId.SeriesType,
      title: TagSectionTitle.SeriesType,
      tags: createTags(filters.seriesTypes, TagSectionTitle.SeriesType),
    },
    {
      id: TagSectionId.Order,
      title: TagSectionTitle.Order,
      tags: createTags(filters.order, TagSectionTitle.Order),
    },
  ];
  return tagSections;
};

export function createTags(filterItems: Array<Tag>, prefix: string): Tag[] {
  return filterItems.map((item) => ({
    id: `${prefix}:${item.id}`,
    title: item.title,
  }));
}
