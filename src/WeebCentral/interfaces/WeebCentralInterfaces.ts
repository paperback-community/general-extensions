import { Tag } from "@paperback/types";

export interface StatusTypes {
  ONGOING: string;
  HIATUS: string;
  COMPLETED: string;
  DROPPED: string;
}

export interface Filters {
  seriesTypes: Array<Tag>;
  genres: Array<Tag>;
  seriesStatuses: Array<Tag>;
  order: Array<Tag>;
}

export interface WeebCentralMetadata {
  page?: number;
  offset?: number;
}
