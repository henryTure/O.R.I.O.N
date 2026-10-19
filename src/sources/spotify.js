// Musik: länk till Spotify. Kopplad så länge enheten är online.
// Vill du senare visa vad som spelas behövs en server med Spotify-inloggning (se README).
import { result } from "./_shared.js";

export const id = "spotify";
export const namn = "Spotify";
export const lamp = "SPOTIFY";

export async function load(cfg) {
  if (!cfg.enabled) return result("off", cfg);
  return result(navigator.onLine ? "ok" : "error", cfg, navigator.onLine ? {} : { error: "offline" });
}
