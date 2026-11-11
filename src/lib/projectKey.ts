/** Suggests a Jira-style project key (e.g. "Website Redesign" -> "WR", "Marketing" -> "MARK"). */
export function suggestKey(title: string): string {
  const words = title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let key = "";
  if (words.length >= 2) key = words.slice(0, 4).map((w) => w[0]).join("");
  else if (words.length === 1) key = words[0].slice(0, 4);
  key = key.replace(/^[0-9]+/, "");
  if (key.length < 2) key = (key + "PRJ").slice(0, 3);
  return key.slice(0, 10);
}

export const KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
