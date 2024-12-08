import { URLBuilder as BaseURLBuilder } from "./base";

class URLBuilder extends BaseURLBuilder {
  protected formatArrayQuery(key: string, value: string[]): string[] {
    return value.length > 0 ? value.map((v) => `${key}=${v}`) : [];
  }
}

export { URLBuilder };
