import { renderLayout, formatMoney, formatDate, type TemplateLanguage } from "./layout";
import { escapeHtml } from "./escape";
import { vat } from "@/lib/domain/fees";

export interface InvoiceParty {
  name: string;
  registryId?: string;
  vatId?: string;
  address?: string;
}

export interface InvoiceInputs {
  language: TemplateLanguage;
  invoiceNumber: string;
  issueDate: string; // ISO date
  description: string;
  net: string; // decimal string
  vatPct: string; // decimal string, e.g. '21.00' (CZ) or '23.00' (SK)
  currency: string;
  supplier: InvoiceParty;
  customer: InvoiceParty;
  reverseChargeNote?: boolean;
}

const reverseChargeClause: Record<TemplateLanguage, string> = {
  CS: "Daň odvede zákazník (přenesení daňové povinnosti, čl. 196 směrnice 2006/112/ES).",
  SK: "Daň platí zákazník (prenesenie daňovej povinnosti, čl. 196 smernice 2006/112/ES).",
  EN: "Reverse charge — VAT to be accounted for by the customer (Article 196 of Directive 2006/112/EC).",
};

const titles: Record<TemplateLanguage, string> = {
  CS: "Faktura — provize za zprostředkování",
  SK: "Faktúra — provízia za sprostredkovanie",
  EN: "Invoice — Commission",
};

function escapeParty(p: InvoiceParty): InvoiceParty {
  return {
    name: escapeHtml(p.name),
    registryId: p.registryId !== undefined ? escapeHtml(p.registryId) : undefined,
    vatId: p.vatId !== undefined ? escapeHtml(p.vatId) : undefined,
    address: p.address !== undefined ? escapeHtml(p.address) : undefined,
  };
}

export function invoice(inputs: InvoiceInputs): { title: string; html: string } {
  const { language: lang, issueDate, net, vatPct, currency } = inputs;
  const invoiceNumber = escapeHtml(inputs.invoiceNumber);
  const description = escapeHtml(inputs.description);
  const supplier = escapeParty(inputs.supplier);
  const customer = escapeParty(inputs.customer);

  const netNum = Number(net);
  const vatPctNum = Number(vatPct);
  // Cents-based, half-up rounding — same helper settleCase uses when it
  // computes the Invoice row's vatAmount, so the DB row and this rendered
  // HTML can never disagree by a rounding cent.
  const { vat: vatAmountStr, grossTotal } = vat(net, vatPct);
  const vatAmountNum = Number(vatAmountStr);
  const totalNum = Number(grossTotal);

  const fmt = (n: number) => formatMoney(String(n), currency, lang);
  const title = titles[lang];
  const date = formatDate(new Date(issueDate), lang);
  const reverseChargeHtml = inputs.reverseChargeNote
    ? `<p><strong>${escapeHtml(reverseChargeClause[lang])}</strong></p>`
    : "";

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `
<h1>${title}</h1>
<p>Faktura č.: <strong>${invoiceNumber}</strong> &nbsp; Datum vystavení: ${date}</p>

<h2>Dodavatel</h2>
<p>${supplier.name}${supplier.registryId ? `, IČO: ${supplier.registryId}` : ""}${supplier.vatId ? `, DIČ: ${supplier.vatId}` : ""}${supplier.address ? `, ${supplier.address}` : ""}</p>

<h2>Odběratel</h2>
<p>${customer.name}${customer.registryId ? `, IČO: ${customer.registryId}` : ""}${customer.vatId ? `, DIČ: ${customer.vatId}` : ""}${customer.address ? `, ${customer.address}` : ""}</p>

<h2>Fakturovaná položka</h2>
<table>
<thead><tr><th>Popis</th><th>Základ daně</th><th>DPH %</th><th>DPH</th><th>Celkem</th></tr></thead>
<tbody>
<tr><td>${description}</td><td>${fmt(netNum)}</td><td>${vatPctNum} %</td><td>${fmt(vatAmountNum)}</td><td>${fmt(totalNum)}</td></tr>
</tbody>
</table>
<p>Splatnost: 14 dní od data vystavení.</p>
${reverseChargeHtml}`,
    SK: `
<h1>${title}</h1>
<p>Faktúra č.: <strong>${invoiceNumber}</strong> &nbsp; Dátum vystavenia: ${date}</p>

<h2>Dodávateľ</h2>
<p>${supplier.name}${supplier.registryId ? `, IČO: ${supplier.registryId}` : ""}${supplier.vatId ? `, IČ DPH: ${supplier.vatId}` : ""}${supplier.address ? `, ${supplier.address}` : ""}</p>

<h2>Odberateľ</h2>
<p>${customer.name}${customer.registryId ? `, IČO: ${customer.registryId}` : ""}${customer.vatId ? `, IČ DPH: ${customer.vatId}` : ""}${customer.address ? `, ${customer.address}` : ""}</p>

<h2>Fakturovaná položka</h2>
<table>
<thead><tr><th>Popis</th><th>Základ dane</th><th>DPH %</th><th>DPH</th><th>Spolu</th></tr></thead>
<tbody>
<tr><td>${description}</td><td>${fmt(netNum)}</td><td>${vatPctNum} %</td><td>${fmt(vatAmountNum)}</td><td>${fmt(totalNum)}</td></tr>
</tbody>
</table>
<p>Splatnosť: 14 dní od dátumu vystavenia.</p>
${reverseChargeHtml}`,
    EN: `
<h1>${title}</h1>
<p>Invoice no.: <strong>${invoiceNumber}</strong> &nbsp; Issue date: ${date}</p>

<h2>Supplier</h2>
<p>${supplier.name}${supplier.registryId ? `, reg. no.: ${supplier.registryId}` : ""}${supplier.vatId ? `, VAT ID: ${supplier.vatId}` : ""}${supplier.address ? `, ${supplier.address}` : ""}</p>

<h2>Customer</h2>
<p>${customer.name}${customer.registryId ? `, reg. no.: ${customer.registryId}` : ""}${customer.vatId ? `, VAT ID: ${customer.vatId}` : ""}${customer.address ? `, ${customer.address}` : ""}</p>

<h2>Invoiced item</h2>
<table>
<thead><tr><th>Description</th><th>Net</th><th>VAT %</th><th>VAT</th><th>Total</th></tr></thead>
<tbody>
<tr><td>${description}</td><td>${fmt(netNum)}</td><td>${vatPctNum}%</td><td>${fmt(vatAmountNum)}</td><td>${fmt(totalNum)}</td></tr>
</tbody>
</table>
<p>Payment terms: 14 days from issue date.</p>
${reverseChargeHtml}`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}
