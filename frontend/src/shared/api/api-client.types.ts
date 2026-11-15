export enum HttpMethod {
  Get = 'GET',
  Patch = 'PATCH',
}

/** What one call sends besides the path: the method and, for a write, the JSON body. */
export interface ApiRequestInit {
  readonly method: HttpMethod;
  readonly body?: unknown;
}
