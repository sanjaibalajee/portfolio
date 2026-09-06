/**
 * LeetCode reports several ids that mean the same thing to a reader — "python"
 * and "python3" are both plain Python here. Display always goes through this so
 * a problem solved under both ids does not read as two languages.
 */
const LANGUAGE_LABELS: Record<string, string> = {
  cpp: "c++",
  csharp: "c#",
  golang: "go",
  mssql: "sql",
  mysql: "sql",
  oraclesql: "sql",
  postgresql: "sql",
  python: "python",
  python3: "python",
  pythondata: "python",
};

export function languageLabel(language: string) {
  const key = language.toLowerCase();
  return LANGUAGE_LABELS[key] ?? key;
}
