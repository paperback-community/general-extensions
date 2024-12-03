class URLBuilder {
  private baseUrl: string;
  private queryParams: Record<string, string | string[]> = {};
  private pathSegments: string[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  path(segment: string): this {
    this.pathSegments.push(segment.replace(/^\/+|\/+$/g, ""));
    return this;
  }

  query(key: string, value: string | string[]): this {
    this.queryParams[key] = value;
    return this;
  }

  build(): string {
    const fullPath =
      this.pathSegments.length > 0 ? `/${this.pathSegments.join("/")}` : "";

    const queryString = Object.entries(this.queryParams)
      .flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0 ? value.map((v) => `${key}=${v}`) : [];
        }
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
