// An address with no file extension, such as /profile or /auth/callback, is answered with
// index.html and the app reads the address itself (D-63).
function handler(event) {
  const request = event.request;
  if (!/\.[^/]+$/.test(request.uri)) {
    request.uri = '/index.html';
  }
  return request;
}
