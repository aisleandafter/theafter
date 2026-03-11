const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function getPhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}
