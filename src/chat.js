// Skicka till Claude. Idag öppnas claude.ai med texten förifylld i ett nytt fönster.
// Senare: byt innehållet i sendToClaude() mot ett API-anrop till en egen chatt.
// Knappen och gränssnittet i övrigt ändras inte.

const NY_CHATT = "https://claude.ai/new?q=";

// Returnerar false om webbläsaren blockerade fönstret.
export function sendToClaude(text) {
  if (!text) return false;
  const w = window.open(NY_CHATT + encodeURIComponent(text), "_blank");
  if (!w) return false;
  w.opener = null;
  return true;
}
