import { renderLayout, formatMoney, type TemplateLanguage } from "./layout";
import { escapeHtml } from "./escape";

export interface AwardContractInputs {
  language: TemplateLanguage;
  caseReference: string;
  creditorName: string;
  agencyName: string;
  amount: string;
  currency: string;
  successFeePct: string;
}

const titles: Record<TemplateLanguage, string> = {
  CS: "Smlouva o přidělení případu vymáhání pohledávky",
  SK: "Zmluva o pridelení prípadu vymáhania pohľadávky",
  EN: "Case Award Agreement",
};

export function awardContract(inputs: AwardContractInputs): { title: string; html: string } {
  const { language: lang, amount, currency } = inputs;
  const caseReference = escapeHtml(inputs.caseReference);
  const creditorName = escapeHtml(inputs.creditorName);
  const agencyName = escapeHtml(inputs.agencyName);
  const successFeePct = escapeHtml(inputs.successFeePct);
  const formattedAmount = formatMoney(amount, currency, lang);
  const title = titles[lang];

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `
<h1>${title}</h1>
<p>Případ: <strong>${caseReference}</strong>. Smluvní strany: provozovatel platformy Vymáhací agentury
(dále jen "Platforma"), vymáhací agentura <strong>${agencyName}</strong> (dále jen "Agentura")
a věřitel <strong>${creditorName}</strong> (dále jen "Věřitel", uveden pro referenci).</p>

<h2>Článek I — Předmět a rozsah</h2>
<p>Platforma přiděluje Agentuře případ vymáhání pohledávky ve výši <strong>${formattedAmount}</strong>.
Agentuře náleží success fee ve výši <strong>${successFeePct} %</strong> z vymožené částky.</p>

<h2>Článek II — Povinnosti Agentury</h2>
<ul>
  <li>Kontaktovat dlužníka pouze v souladu s platnými pravidly pro vymáhání pohledávek</li>
  <li>Poskytovat Platformě pravidelné reportování o průběhu vymáhání (min. jednou týdně)</li>
  <li>Postoupit vymožené prostředky Platformě do 14 dnů od jejich přijetí</li>
</ul>

<div class="signature-block">
  <div class="signer"><p>Za Agenturu: ${agencyName}</p></div>
  <div class="signer"><p>Za Platformu</p></div>
</div>`,
    SK: `
<h1>${title}</h1>
<p>Prípad: <strong>${caseReference}</strong>. Zmluvné strany: prevádzkovateľ platformy Vymáhací agentury
(ďalej len "Platforma"), vymáhacia agentúra <strong>${agencyName}</strong> (ďalej len "Agentúra")
a veriteľ <strong>${creditorName}</strong> (ďalej len "Veriteľ", uvedený pre referenciu).</p>

<h2>Článok I — Predmet a rozsah</h2>
<p>Platforma prideľuje Agentúre prípad vymáhania pohľadávky vo výške <strong>${formattedAmount}</strong>.
Agentúre patrí success fee vo výške <strong>${successFeePct} %</strong> z vymoženej sumy.</p>

<h2>Článok II — Povinnosti Agentúry</h2>
<ul>
  <li>Kontaktovať dlžníka iba v súlade s platnými pravidlami pre vymáhanie pohľadávok</li>
  <li>Poskytovať Platforme pravidelné reportovanie o priebehu vymáhania (min. raz týždenne)</li>
  <li>Postúpiť vymožené prostriedky Platforme do 14 dní od ich prijatia</li>
</ul>

<div class="signature-block">
  <div class="signer"><p>Za Agentúru: ${agencyName}</p></div>
  <div class="signer"><p>Za Platformu</p></div>
</div>`,
    EN: `
<h1>${title}</h1>
<p>Case: <strong>${caseReference}</strong>. Parties: the operator of the Vymáhací agentury platform
(the "Platform"), the collection agency <strong>${agencyName}</strong> (the "Agency"), and the
creditor <strong>${creditorName}</strong> (the "Creditor", listed for reference).</p>

<h2>Article I — Subject matter and scope</h2>
<p>The Platform awards the Agency the case for recovery of a claim in the amount of
<strong>${formattedAmount}</strong>. The Agency is entitled to a success fee of
<strong>${successFeePct}%</strong> of the amount recovered.</p>

<h2>Article II — Agency obligations</h2>
<ul>
  <li>Contact the debtor only in accordance with applicable debt-collection conduct rules</li>
  <li>Provide the Platform with regular reporting on collection progress (at least weekly)</li>
  <li>Remit recovered funds to the Platform within 14 days of receipt</li>
</ul>

<div class="signature-block">
  <div class="signer"><p>For the Agency: ${agencyName}</p></div>
  <div class="signer"><p>For the Platform</p></div>
</div>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}
