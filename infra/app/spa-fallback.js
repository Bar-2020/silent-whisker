// A CloudFront Function (runtime cloudfront-js-2.0, D-63) that runs on every request for the app's
// files. The app draws its own pages in the browser, so an address with no file extension, such as
// /profile or /auth/callback, is answered with index.html and the app reads the address itself.
function handler(event) {
  const request = event.request;
  if (!/\.[^/]+$/.test(request.uri)) {
    request.uri = '/index.html';
  }
  return request;
}
