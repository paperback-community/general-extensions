type QueryValue = string | number | boolean | string[] | object;

class URLBuilder {
  private baseUrl: string;
  private queryParams: Record<string, QueryValue> = {};
  private pathSegments: string[] = [];
  private queryArrayPrefix: string | undefined;

  constructor(baseUrl: string, queryArrayPrefix?: string) {
    this.queryArrayPrefix = queryArrayPrefix;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  addPath(segment: string): this {
    this.pathSegments.push(segment.replace(/^\/+|\/+$/g, ""));
    return this;
  }

  addQuery(key: string, value: QueryValue): this {
    this.queryParams[key] = value;
    return this;
  }

  build(): string {
    const fullPath =
      this.pathSegments.length > 0 ? `/${this.pathSegments.join("/")}` : "";

    const queryString = Object.entries(this.queryParams)
      .flatMap(([key, value]) => {
        // Handle string[]
        if (Array.isArray(value)) {
          return value.length > 0
            ? value.map((v) => `${key}${this.queryArrayPrefix}=${v}`)
            : [];
        }

        // Handle objects
        if (typeof value === "object") {
          return Object.entries(value)
            .map(([objKey, objValue]) =>
              objValue !== undefined
                ? `${key}[${objKey}]=${objValue}`
                : undefined,
            )
            .filter((x) => x !== undefined);
        }

        // Default handling
        return value === "" ? [] : [`${key}=${value}`];
      })
      .join("&");

    return queryString
      ? `${this.baseUrl}${fullPath}?${queryString}`
      : `${this.baseUrl}${fullPath}`;
  }

  reset(): this {
    this.queryParams = {};
    this.pathSegments = [];
    return this;
  }
}

export { URLBuilder };
