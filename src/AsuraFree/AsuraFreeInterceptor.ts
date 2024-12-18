import { PaperbackInterceptor, Request, Response } from "@paperback/types";
import { AS_DOMAIN } from "./AsuraFreeConfig";

export class AsuraFreeInterceptor extends PaperbackInterceptor {
  override async interceptRequest(request: Request): Promise<Request> {
    request.headers = {
      ...request.headers,
      referer: `${AS_DOMAIN}/`,
    };
    return request;
  }

  override async interceptResponse(
    request: Request,
    response: Response,
    data: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    return data;
  }
}