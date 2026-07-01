const SEARCH_HISTORY_KEY = "nailed_search_history";
const MAX_HISTORY = 10;

export function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSearchHistory(keyword) {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const history = getSearchHistory();
  const updated = [trimmed, ...history.filter((k) => k !== trimmed)].slice(0, MAX_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

export function removeSearchHistory(keyword) {
  const history = getSearchHistory();
  localStorage.setItem(
    SEARCH_HISTORY_KEY,
    JSON.stringify(history.filter((k) => k !== keyword)),
  );
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}
