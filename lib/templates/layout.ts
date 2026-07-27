export type TemplateLanguage = "CS" | "SK" | "EN";

const localeTag: Record<TemplateLanguage, string> = {
  CS: "cs-CZ",
  SK: "sk-SK",
  EN: "en-US",
};

// Formats a decimal-string amount as currency for the given template language.
export function formatMoney(amount: string, currency: string, lang: TemplateLanguage): string {
  return new Intl.NumberFormat(localeTag[lang], { style: "currency", currency }).format(Number(amount));
}

// Formats a decimal-string amount as a plain number (no currency symbol) for the given language.
export function formatNumber(amount: string, lang: TemplateLanguage): string {
  return new Intl.NumberFormat(localeTag[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(amount),
  );
}

export function formatDate(d: Date, lang: TemplateLanguage): string {
  return new Intl.DateTimeFormat(localeTag[lang], { dateStyle: "medium" }).format(d);
}

const bannerText: Record<TemplateLanguage, string> = {
  CS: "NÁVRH DOKUMENTU — podléhá schválení právním poradcem",
  SK: "NÁVRH DOKUMENTU — podlieha schváleniu právnym poradcom",
  EN: "DRAFT DOCUMENT — subject to legal counsel approval",
};

const generatedAtLabel: Record<TemplateLanguage, string> = {
  CS: "Vygenerováno",
  SK: "Vygenerované",
  EN: "Generated at",
};

const docIdLabel: Record<TemplateLanguage, string> = {
  CS: "ID dokumentu",
  SK: "ID dokumentu",
  EN: "Document ID",
};

// Shared HTML shell for all generated legal documents. Embeds a prominent
// draft banner and a minimal print-oriented (A4-ish) stylesheet.
export function renderLayout(title: string, bodyHtml: string, lang: TemplateLanguage): string {
  const banner = bannerText[lang];

  return `<!doctype html>
<html lang="${lang.toLowerCase()}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 2.5cm; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    max-width: 21cm;
    margin: 0 auto;
    padding: 2.5cm;
    color: #1a1a1a;
    line-height: 1.5;
  }
  header.doc-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 0.5em;
    margin-bottom: 1em;
  }
  header.doc-header .wordmark {
    font-weight: bold;
    font-size: 1.1em;
    letter-spacing: 0.02em;
  }
  .draft-banner {
    background: #fff3cd;
    border: 2px solid #b8860b;
    color: #6b4e00;
    font-weight: bold;
    text-align: center;
    padding: 0.6em 1em;
    margin-bottom: 1.5em;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  h1 { font-size: 1.4em; }
  h2 { font-size: 1.1em; margin-top: 1.5em; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  table th, table td { border: 1px solid #999; padding: 0.4em 0.6em; text-align: left; }
  .signature-block { margin-top: 2em; display: flex; gap: 2em; flex-wrap: wrap; }
  .signature-block .signer { flex: 1; min-width: 12em; border-top: 1px solid #1a1a1a; padding-top: 0.3em; }
  footer.doc-footer {
    margin-top: 2em;
    padding-top: 0.5em;
    border-top: 1px solid #999;
    font-size: 0.8em;
    color: #555;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
<header class="doc-header">
  <span class="wordmark">Vymáhací agentury</span>
</header>
<div class="draft-banner">${banner}</div>
${bodyHtml}
<footer class="doc-footer">
  <span>${generatedAtLabel[lang]}: <span class="generated-at">{{GENERATED_AT}}</span></span>
  <span>${docIdLabel[lang]}: <span class="doc-id">{{DOCUMENT_ID}}</span></span>
</footer>
</body>
</html>`;
}
