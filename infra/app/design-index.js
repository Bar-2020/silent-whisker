// The design mocks live under /design/ on the app's address (D-89). /design is sent to /design/, so
// the pages' relative links resolve, and an address ending in / is answered with its index.html.
function handler(event) {
  const request = event.request;
  if (request.uri === '/design') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/design/' } },
    };
  }
  if (request.uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  return request;
}
