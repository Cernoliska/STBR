import fetch from "node-fetch";

export async function detectRoleFromWiki(username) {
  if (!username) return "user";
  if (username === "Janorovic Volkov") return "developer";

  try {
    const url = `https://id.wikipedia.org/w/api.php?action=query&list=users&ususers=${encodeURIComponent(username)}&usprop=groups&format=json`;
    const res = await fetch(url);
    const j = await res.json();
    const groups = j?.query?.users?.[0]?.groups || [];
    if (groups.includes("sysop") || groups.includes("bureaucrat")) return "pengurus";
  } catch (e) {
    console.error("roles.detect error", e);
  }
  return "user";
}
