// Projektlogg: senaste ändringar i användarens publika GitHub-repon.
// GitHubs öppna API räcker (60 anrop per timme utan nyckel).
import { result, example, fetchJSON } from "./_shared.js";

export const id = "github";
export const namn = "GitHub";
export const lamp = "GITHUB";

const EXEMPEL = [
  { repo: "ORION", text: "Första testversion av startsidan" },
  { repo: "Trading", text: "Simulerad budget och strategi" },
  { repo: "—", text: "Fler repon visas när GitHub är kopplat" },
];

export async function load(cfg, g) {
  if (!cfg.enabled || !cfg.user) return example({ andringar: EXEMPEL });
  const events = await fetchJSON(`https://api.github.com/users/${encodeURIComponent(cfg.user)}/events/public?per_page=40`, g.timeout, {
    headers: { Accept: "application/vnd.github+json" },
  });
  const andringar = [];
  for (const e of events) {
    const repo = e.repo.name.split("/")[1];
    const lank = `https://github.com/${e.repo.name}`;
    if (e.type === "PushEvent") {
      for (const c of (e.payload.commits || []).slice().reverse()) {
        andringar.push({ repo, text: c.message.split("\n")[0], tid: e.created_at, lank: `${lank}/commit/${c.sha}` });
      }
    } else if (e.type === "CreateEvent" && e.payload.ref_type === "repository") {
      andringar.push({ repo, text: "Nytt repo skapat", tid: e.created_at, lank });
    } else if (e.type === "PullRequestEvent") {
      andringar.push({ repo, text: `PR ${e.payload.action}: ${e.payload.pull_request.title}`, tid: e.created_at, lank: e.payload.pull_request.html_url });
    }
    if (andringar.length >= 5) break;
  }
  return result("ok", { andringar: andringar.slice(0, 5) });
}
