import { renderLayout, type TemplateLanguage } from "./layout";
import { escapeHtml } from "./escape";

export interface GdprNoticeInputs {
  language: TemplateLanguage;
  controllerName: string;
  processorName: string;
  debtorName: string;
  caseReference: string;
}

const titles: Record<TemplateLanguage, string> = {
  CS: "Poučení o zpracování osobních údajů (GDPR)",
  SK: "Poučenie o spracovaní osobných údajov (GDPR)",
  EN: "Notice on Processing of Personal Data (GDPR)",
};

export function gdprNotice(inputs: GdprNoticeInputs): { title: string; html: string } {
  const { language: lang } = inputs;
  const controllerName = escapeHtml(inputs.controllerName);
  const processorName = escapeHtml(inputs.processorName);
  const debtorName = escapeHtml(inputs.debtorName);
  const caseReference = escapeHtml(inputs.caseReference);
  const title = titles[lang];

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `
<h1>${title}</h1>
<p>Případ: ${caseReference}. Dotčená osoba: <strong>${debtorName}</strong>.</p>

<h2>Správce a zpracovatel</h2>
<p>Správcem osobních údajů je <strong>${controllerName}</strong> (věřitel). Platforma a jí pověřená
vymáhací agentura vystupují jako zpracovatelé osobních údajů: <strong>${processorName}</strong>.</p>

<h2>Účely zpracování</h2>
<p>Osobní údaje jsou zpracovávány výhradně za účelem vymáhání pohledávky, komunikace s dlužníkem
a plnění zákonných povinností souvisejících se správou pohledávek.</p>

<h2>Doba uchování</h2>
<p>Osobní údaje jsou uchovávány po dobu trvání případu a dále po dobu vyžadovanou právními předpisy
pro archivaci účetních a smluvních dokladů.</p>

<h2>Práva dotčené osoby</h2>
<ul>
  <li>Právo na přístup k osobním údajům</li>
  <li>Právo na opravu nepřesných údajů</li>
  <li>Právo na výmaz ("právo být zapomenut")</li>
  <li>Právo na omezení zpracování</li>
  <li>Právo na přenositelnost údajů</li>
  <li>Právo vznést námitku proti zpracování</li>
  <li>Právo podat stížnost u dozorového úřadu</li>
</ul>`,
    SK: `
<h1>${title}</h1>
<p>Prípad: ${caseReference}. Dotknutá osoba: <strong>${debtorName}</strong>.</p>

<h2>Prevádzkovateľ a sprostredkovateľ</h2>
<p>Prevádzkovateľom osobných údajov je <strong>${controllerName}</strong> (veriteľ). Platforma a ňou
poverená vymáhacia agentúra vystupujú ako sprostredkovatelia osobných údajov: <strong>${processorName}</strong>.</p>

<h2>Účely spracovania</h2>
<p>Osobné údaje sú spracúvané výhradne na účel vymáhania pohľadávky, komunikácie s dlžníkom
a plnenia zákonných povinností súvisiacich so správou pohľadávok.</p>

<h2>Doba uchovávania</h2>
<p>Osobné údaje sú uchovávané počas trvania prípadu a ďalej počas doby vyžadovanej právnymi predpismi
pre archiváciu účtovných a zmluvných dokladov.</p>

<h2>Práva dotknutej osoby</h2>
<ul>
  <li>Právo na prístup k osobným údajom</li>
  <li>Právo na opravu nepresných údajov</li>
  <li>Právo na vymazanie ("právo na zabudnutie")</li>
  <li>Právo na obmedzenie spracúvania</li>
  <li>Právo na prenosnosť údajov</li>
  <li>Právo namietať proti spracúvaniu</li>
  <li>Právo podať sťažnosť dozornému orgánu</li>
</ul>`,
    EN: `
<h1>${title}</h1>
<p>Case: ${caseReference}. Data subject: <strong>${debtorName}</strong>.</p>

<h2>Controller and processor</h2>
<p>The data controller is <strong>${controllerName}</strong> (the creditor). The Platform and the
collection agency it engages act as data processors: <strong>${processorName}</strong>.</p>

<h2>Purposes of processing</h2>
<p>Personal data is processed solely for the purpose of debt recovery, communication with the debtor,
and compliance with legal obligations related to claims administration.</p>

<h2>Retention period</h2>
<p>Personal data is retained for the duration of the case and thereafter for the period required by
applicable law for the archiving of accounting and contractual records.</p>

<h2>Data subject rights</h2>
<ul>
  <li>Right of access to personal data</li>
  <li>Right to rectification of inaccurate data</li>
  <li>Right to erasure ("right to be forgotten")</li>
  <li>Right to restriction of processing</li>
  <li>Right to data portability</li>
  <li>Right to object to processing</li>
  <li>Right to lodge a complaint with a supervisory authority</li>
</ul>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}
