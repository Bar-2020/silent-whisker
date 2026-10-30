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
