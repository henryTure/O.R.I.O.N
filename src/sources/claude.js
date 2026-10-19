// Claude: länkar till claude.ai. Kopplad så länge enheten är online.
import { result } from "./_shared.js";

export const id = "claude";
export const namn = "Claude";
export const lamp = "CLAUDE";

export async function load(cfg) {
  if (!cfg.enabled) return result("off", cfg);
  return result(navigator.onLine ? "ok" : "error", cfg, navigator.onLine ? {} : { error: "offline" });
}
