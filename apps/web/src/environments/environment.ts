// API origin. Dev: the Laravel core-api on :8000 (CORS-enabled for :4200).
// Prod: serve the built app same-origin behind the API and set this to ''.
export const environment = {
  apiBase: 'http://127.0.0.1:8000',
};
