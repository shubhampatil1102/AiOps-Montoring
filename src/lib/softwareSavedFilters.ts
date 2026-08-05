// Saved filters / column visibility for the Software > Installed grid.
// Browser-local only (localStorage) — not synced across devices or users,
// since there's no per-user preferences table in the backend today. This is
// disclosed in the UI rather than presented as a shared/cross-device feature.

export interface SoftwareSavedFilter {
  name: string;
  search: string;
  category: string;
  publisher: string;
  visibleColumns: string[];
}

const FILTERS_KEY = "nexops.software.savedFilters";
const COLUMNS_KEY = "nexops.software.visibleColumns";

export function loadSavedFilters(): SoftwareSavedFilter[] {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? (JSON.parse(raw) as SoftwareSavedFilter[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedFilter(filter: SoftwareSavedFilter) {
  const existing = loadSavedFilters().filter((f) => f.name !== filter.name);
  localStorage.setItem(FILTERS_KEY, JSON.stringify([...existing, filter]));
}

export function deleteSavedFilter(name: string) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(loadSavedFilters().filter((f) => f.name !== name)));
}

export function loadVisibleColumns(defaultColumns: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set(defaultColumns);
  } catch {
    return new Set(defaultColumns);
  }
}

export function saveVisibleColumns(columns: Set<string>) {
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(Array.from(columns)));
}
