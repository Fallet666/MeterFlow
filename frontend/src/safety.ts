export type FavoriteChartConfig = {
  id: string;
  name: string;
  properties: number[];
  resourceType: string;
  rangePreset: "year" | "half" | "two";
};

const RANGE_PRESETS = new Set(["year", "half", "two"]);

export const parseJson = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const parseStoredUser = (value: string | null): { username?: string } | null => {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const username = (parsed as Record<string, unknown>).username;
  return typeof username === "string" ? { username } : null;
};

export const parsePositiveInt = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const numberOrZero = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const arrayOrEmpty = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export const errorMessage = (detail: unknown, fallback: string): string => {
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};

const isFavoriteChartConfig = (value: unknown): value is FavoriteChartConfig => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.properties) &&
    candidate.properties.every((id) => Number.isInteger(id) && id > 0) &&
    typeof candidate.resourceType === "string" &&
    typeof candidate.rangePreset === "string" &&
    RANGE_PRESETS.has(candidate.rangePreset)
  );
};

export const parseFavoriteCharts = (value: string | null): FavoriteChartConfig[] => {
  const parsed = parseJson(value);
  return arrayOrEmpty(parsed).filter(isFavoriteChartConfig);
};
