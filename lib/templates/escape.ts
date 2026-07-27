// Escapes user-controlled text before interpolating it into generated HTML.
// Numbers/dates that are formatted via Intl in layout.ts do not need this.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
