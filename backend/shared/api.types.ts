/** The claims of a verified ID token, as the API's JWT authorizer hands them over. */
export type Claims = Record<string, string | undefined> & { sub: string };

/** What a handler reads of the API Gateway event. */
export interface ApiEvent {
  body?: string;
  requestContext: { authorizer?: { jwt?: { claims?: Record<string, string | undefined> } } };
}

export interface ApiResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
