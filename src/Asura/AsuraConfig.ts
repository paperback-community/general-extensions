const BASE_VERSION = "1.0.0";

export const AS_DOMAIN = "https://asuracomic.net";

export const AS_API_DOMAIN = "https://gg.asuracomic.net";

export const getExportVersion = (EXTENSION_VERSION: string): string => {
  return BASE_VERSION.split(".")
    .map((x, index) => Number(x) + Number(EXTENSION_VERSION.split(".")[index]))
    .join(".");
};
