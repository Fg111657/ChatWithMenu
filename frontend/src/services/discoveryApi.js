import { BASE_URL } from "./backendData";

async function _send(path, { method = "GET", body } = {}) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const resp = await fetch(`${BASE_URL}${path}`, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${method} ${path} failed: ${resp.status} ${text.slice(0, 120)}`);
  }
  try { return await resp.json(); } catch { return null; }
}

export function saveRestaurant(userId, restaurantId) {
  return _send(`/user/${userId}/save/${restaurantId}`, { method: "POST" });
}
export function unsaveRestaurant(userId, restaurantId) {
  return _send(`/user/${userId}/save/${restaurantId}`, { method: "DELETE" });
}
export function skipRestaurant(userId, restaurantId) {
  return _send(`/user/${userId}/skip/${restaurantId}`, { method: "POST" });
}
export function unskipRestaurant(userId, restaurantId) {
  return _send(`/user/${userId}/skip/${restaurantId}`, { method: "DELETE" });
}
export function loadDiscoveryState(userId) {
  return _send(`/user/${userId}/discovery_state`);
}
export function mergeLocalIntoBackend(userId, { saved, skipped }) {
  return _send(`/user/${userId}/discovery_state`, {
    method: "POST",
    body: { saved: Array.from(saved || []), skipped: Array.from(skipped || []) },
  });
}

export function restaurantPhotoUrl(restaurantId, photoIndex = 0) {
  return `${BASE_URL}/restaurant/${restaurantId}/photo/${photoIndex}`;
}

const discoveryApi = {
  saveRestaurant,
  unsaveRestaurant,
  skipRestaurant,
  unskipRestaurant,
  loadDiscoveryState,
  mergeLocalIntoBackend,
  restaurantPhotoUrl,
};

export default discoveryApi;
