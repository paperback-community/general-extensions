import { Filters } from "./interfaces/AsuraScansFreeInterfaces";

export async function setFilters(data: Filters) {
  for (const genre of data.genres) {
    Application.setState(genre.id.toString(), genre.name.toUpperCase());
  }
}

export async function getFilter(filter: string): Promise<string> {
  const genre =
    ((await Application.getState(filter.toUpperCase())) as string) ?? "";
  return genre.toString();
}
