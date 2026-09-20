export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:1500";

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:changed"));
}

export function getAuthHeaders(includeJson = false) {
  const token = localStorage.getItem("token");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function authenticatedFetch(input, init = {}) {
  const response = await fetch(input, init);

  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
  }

  return response;
}

export async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearAuth();
    throw new Error(data.message || "Please log in again.");
  }
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
}
