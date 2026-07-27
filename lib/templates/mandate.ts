import { renderLayout, formatMoney, formatDate, type TemplateLanguage } from "./layout";
import { escapeHtml } from "./escape";

export interface MandateInputs {
  language: TemplateLanguage;
  creditor: { name: string; registryId: string; country: string };
  debtor: { name: string; amount: string; currency: string; dueDate: string; description?: string };
  gdprReference?: string;
}

const titles: Record<TemplateLanguage, string> = {
  CS: "Mandátní smlouva o zprostředkování vymáhání pohledávky",
  SK: "Mandátna zmluva o sprostredkovaní vymáhania pohľadávky",
  EN: "Collection Mandate Agreement",
};

export function mandate(inputs: MandateInputs): { title: string; html: string } {
  const { language: lang, creditor: creditorRaw, debtor: debtorRaw } = inputs;
  const amount = formatMoney(debtorRaw.amount, debtorRaw.currency, lang);
  const dueDate = formatDate(new Date(debtorRaw.dueDate), lang);
  const title = titles[lang];

  const creditor = {
    name: escapeHtml(creditorRaw.name),
    registryId: escapeHtml(creditorRaw.registryId),
    country: escapeHtml(creditorRaw.country),
  };
  const debtor = {
    name: escapeHtml(debtorRaw.name),
    description: debtorRaw.description !== undefined ? escapeHtml(debtorRaw.description) : undefined,
  };
  const gdprReference = inputs.gdprReference !== undefined ? escapeHtml(inputs.gdprReference) : undefined;

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `
<h1>${title}</h1>
<p>Tato mandátní smlouva se uzavírá mezi věřitelem <strong>${creditor.name}</strong>
(IČO/registrační číslo: ${creditor.registryId}, země: ${creditor.country}) (dále jen "Věřitel")
a provozovatelem platformy Vymáhací agentury (dále jen "Platforma").</p>

<h2>Článek I — Předmět smlouvy</h2>
<p>Věřitel pověřuje Platformu zprostředkováním vymáhání pohledávky vůči dlužníkovi
<strong>${debtor.name}</strong> ve výši <strong>${amount}</strong>, se splatností
<strong>${dueDate}</strong>. Popis pohledávky: ${debtor.description ?? "—"}.</p>

<h2>Článek II — Odměna za zprostředkování</h2>
<p>Výše provize (success fee) bude stanovena na základě výsledku výběrového řízení
mezi vymáhacími agenturami a bude doplněna po přidělení případu (___ % z vymožené částky).</p>

<h2>Článek III — Zpracování osobních údajů</h2>
<p>Zpracování osobních údajů dlužníka se řídí samostatným poučením GDPR
(referenční číslo: ${gdprReference ?? "—"}).</p>

<div class="signature-block">
  <div class="signer"><p>Za Věřitele: ${creditor.name}</p></div>
</div>`,
    SK: `
<h1>${title}</h1>
<p>Táto mandátna zmluva sa uzatvára medzi veriteľom <strong>${creditor.name}</strong>
(IČO/registračné číslo: ${creditor.registryId}, krajina: ${creditor.country}) (ďalej len "Veriteľ")
a prevádzkovateľom platformy Vymáhací agentury (ďalej len "Platforma").</p>

<h2>Článok I — Predmet zmluvy</h2>
<p>Veriteľ poveruje Platformu sprostredkovaním vymáhania pohľadávky voči dlžníkovi
<strong>${debtor.name}</strong> vo výške <strong>${amount}</strong>, so splatnosťou
<strong>${dueDate}</strong>. Popis pohľadávky: ${debtor.description ?? "—"}.</p>

<h2>Článok II — Odmena za sprostredkovanie</h2>
<p>Výška provízie (success fee) bude stanovená na základe výsledku výberového konania
medzi vymáhacími agentúrami a bude doplnená po pridelení prípadu (___ % z vymoženej sumy).</p>

<h2>Článok III — Spracovanie osobných údajov</h2>
<p>Spracovanie osobných údajov dlžníka sa riadi samostatným poučením GDPR
(referenčné číslo: ${gdprReference ?? "—"}).</p>

<div class="signature-block">
  <div class="signer"><p>Za Veriteľa: ${creditor.name}</p></div>
</div>`,
    EN: `
<h1>${title}</h1>
<p>This mandate agreement is entered into between the creditor <strong>${creditor.name}</strong>
(registry ID: ${creditor.registryId}, country: ${creditor.country}) (the "Creditor")
and the operator of the Vymáhací agentury platform (the "Platform").</p>

<h2>Article I — Subject matter</h2>
<p>The Creditor engages the Platform to arrange recovery of a claim against the debtor
<strong>${debtor.name}</strong> in the amount of <strong>${amount}</strong>, due on
<strong>${dueDate}</strong>. Claim description: ${debtor.description ?? "—"}.</p>

<h2>Article II — Success fee</h2>
<p>The success fee will be determined based on the outcome of the agency bidding process
and will be filled in upon award (___ % of the recovered amount).</p>

<h2>Article III — Personal data processing</h2>
<p>Processing of the debtor's personal data is governed by a separate GDPR notice
(reference: ${gdprReference ?? "—"}).</p>

<div class="signature-block">
  <div class="signer"><p>For the Creditor: ${creditor.name}</p></div>
</div>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}
