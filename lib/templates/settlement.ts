import { renderLayout, formatMoney, formatDate, type TemplateLanguage } from "./layout";
import { escapeHtml } from "./escape";

export interface SettlementInputs {
  language: TemplateLanguage;
  caseReference: string;
  creditorName: string;
  debtorName: string;
  amount: string;
  currency: string;
  installments: number;
  monthlyAmount: string;
  agreementDate: string; // ISO date; first installment is due 30 days after this date
}

const titles: Record<TemplateLanguage, string> = {
  CS: "Dohoda o splátkovém kalendáři",
  SK: "Dohoda o splátkovom kalendári",
  EN: "Settlement and Installment Agreement",
};

const tableHeaders: Record<TemplateLanguage, [string, string, string]> = {
  CS: ["Splátka č.", "Splatnost", "Částka"],
  SK: ["Splátka č.", "Splatnosť", "Suma"],
  EN: ["Installment #", "Due date", "Amount"],
};

function installmentDueDates(agreementDate: string, count: number): Date[] {
  const base = new Date(agreementDate);
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + 30); // first installment due 30 days after agreement
    d.setUTCMonth(d.getUTCMonth() + i); // subsequent installments monthly
    dates.push(d);
  }
  return dates;
}

export function settlement(inputs: SettlementInputs): { title: string; html: string } {
  const { language: lang, amount, currency, installments, monthlyAmount, agreementDate } = inputs;
  const caseReference = escapeHtml(inputs.caseReference);
  const creditorName = escapeHtml(inputs.creditorName);
  const debtorName = escapeHtml(inputs.debtorName);

  const formattedAmount = formatMoney(amount, currency, lang);
  const dueDates = installmentDueDates(agreementDate, installments);
  const [colNo, colDue, colAmount] = tableHeaders[lang];
  const rows = dueDates
    .map(
      (d, i) =>
        `<tr><td>${i + 1}</td><td>${formatDate(d, lang)}</td><td>${formatMoney(monthlyAmount, currency, lang)}</td></tr>`,
    )
    .join("\n");

  const table = `<table>
<thead><tr><th>${colNo}</th><th>${colDue}</th><th>${colAmount}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  const title = titles[lang];

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `
<h1>${title}</h1>
<p>Případ: <strong>${caseReference}</strong>. Věřitel: <strong>${creditorName}</strong>.
Dlužník: <strong>${debtorName}</strong>.</p>

<h2>Článek I — Uznání dluhu</h2>
<p>Dlužník tímto uznává svůj dluh vůči Věřiteli ve výši <strong>${formattedAmount}</strong>.</p>

<h2>Článek II — Splátkový kalendář</h2>
<p>Dluh bude uhrazen ve ${installments} splátkách dle níže uvedeného rozpisu:</p>
${table}

<div class="signature-block">
  <div class="signer"><p>Dlužník: ${debtorName}</p></div>
  <div class="signer"><p>Za vymáhací agenturu</p></div>
</div>`,
    SK: `
<h1>${title}</h1>
<p>Prípad: <strong>${caseReference}</strong>. Veriteľ: <strong>${creditorName}</strong>.
Dlžník: <strong>${debtorName}</strong>.</p>

<h2>Článok I — Uznanie dlhu</h2>
<p>Dlžník týmto uznáva svoj dlh voči Veriteľovi vo výške <strong>${formattedAmount}</strong>.</p>

<h2>Článok II — Splátkový kalendár</h2>
<p>Dlh bude uhradený v ${installments} splátkach podľa nižšie uvedeného rozpisu:</p>
${table}

<div class="signature-block">
  <div class="signer"><p>Dlžník: ${debtorName}</p></div>
  <div class="signer"><p>Za vymáhaciu agentúru</p></div>
</div>`,
    EN: `
<h1>${title}</h1>
<p>Case: <strong>${caseReference}</strong>. Creditor: <strong>${creditorName}</strong>.
Debtor: <strong>${debtorName}</strong>.</p>

<h2>Article I — Acknowledgement of debt</h2>
<p>The Debtor hereby acknowledges the debt owed to the Creditor in the amount of
<strong>${formattedAmount}</strong>.</p>

<h2>Article II — Installment schedule</h2>
<p>The debt will be repaid in ${installments} installments per the schedule below:</p>
${table}

<div class="signature-block">
  <div class="signer"><p>Debtor: ${debtorName}</p></div>
  <div class="signer"><p>For the collection agency</p></div>
</div>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}
