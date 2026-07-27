import type { DocumentType, GeneratedDocument } from "@prisma/client";
import { db } from "@/lib/db";
import { sha256hex } from "@/lib/ids";
import { providers } from "@/lib/providers";
import { storage } from "@/lib/providers/storage";
import { renderLayout, formatMoney, formatDate, type TemplateLanguage } from "@/lib/templates/layout";
import { escapeHtml } from "@/lib/templates/escape";
import { mandate, type MandateInputs } from "@/lib/templates/mandate";
import { gdprNotice, type GdprNoticeInputs } from "@/lib/templates/gdpr-notice";
import { awardContract, type AwardContractInputs } from "@/lib/templates/award-contract";
import { settlement, type SettlementInputs } from "@/lib/templates/settlement";

const TEMPLATE_IDS: Partial<Record<DocumentType, string>> = {
  MANDATE: "ts:mandate@1",
  GDPR_NOTICE: "ts:gdpr-notice@1",
  AWARD_CONTRACT: "ts:award-contract@1",
  SETTLEMENT: "ts:settlement@1",
  INSTALLMENT_PLAN: "ts:settlement@1",
  PAYMENT_RECEIPT: "ts:receipt@1",
  DEBTOR_NOTICE: "ts:debtor-notice@1",
};

interface ReceiptInputs {
  caseReference: string;
  payerName: string;
  amount: string;
  currency: string;
  paymentDate: string;
}

const receiptTitles: Record<TemplateLanguage, string> = {
  CS: "Potvrzení o přijaté platbě",
  SK: "Potvrdenie o prijatej platbe",
  EN: "Payment Receipt",
};

function renderReceipt(inputs: ReceiptInputs, lang: TemplateLanguage): { title: string; html: string } {
  const amount = formatMoney(inputs.amount, inputs.currency, lang);
  const date = formatDate(new Date(inputs.paymentDate), lang);
  const title = receiptTitles[lang];
  const caseReference = escapeHtml(inputs.caseReference);
  const payerName = escapeHtml(inputs.payerName);

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `<h1>${title}</h1>
<p>Případ: <strong>${caseReference}</strong></p>
<p>Potvrzujeme přijetí platby od <strong>${payerName}</strong> ve výši
<strong>${amount}</strong> dne ${date}.</p>`,
    SK: `<h1>${title}</h1>
<p>Prípad: <strong>${caseReference}</strong></p>
<p>Potvrdzujeme prijatie platby od <strong>${payerName}</strong> vo výške
<strong>${amount}</strong> dňa ${date}.</p>`,
    EN: `<h1>${title}</h1>
<p>Case: <strong>${caseReference}</strong></p>
<p>We confirm receipt of a payment from <strong>${payerName}</strong> in the amount of
<strong>${amount}</strong> on ${date}.</p>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}

interface DebtorNoticeInputs {
  agencyName: string;
  debtorName: string;
  caseReference: string;
  amount: string;
  currency: string;
  dueDate: string;
}

const noticeTitles: Record<TemplateLanguage, string> = {
  CS: "Výzva k úhradě dluhu",
  SK: "Výzva na úhradu dlhu",
  EN: "Debtor Notice",
};

function renderDebtorNotice(inputs: DebtorNoticeInputs, lang: TemplateLanguage): { title: string; html: string } {
  const amount = formatMoney(inputs.amount, inputs.currency, lang);
  const dueDate = formatDate(new Date(inputs.dueDate), lang);
  const title = noticeTitles[lang];
  const agencyName = escapeHtml(inputs.agencyName);
  const debtorName = escapeHtml(inputs.debtorName);
  const caseReference = escapeHtml(inputs.caseReference);

  const bodyByLang: Record<TemplateLanguage, string> = {
    CS: `<h1>${title}</h1>
<p>Vážený/á ${debtorName},</p>
<p>vymáhací agentura <strong>${agencyName}</strong> byla pověřena vymáháním Vaší pohledávky
č. <strong>${caseReference}</strong> ve výši <strong>${amount}</strong>, splatné dne ${dueDate}.
Žádáme Vás o úhradu dlužné částky nebo o kontaktování agentury za účelem dohody o splátkách.</p>`,
    SK: `<h1>${title}</h1>
<p>Vážený/á ${debtorName},</p>
<p>vymáhacia agentúra <strong>${agencyName}</strong> bola poverená vymáhaním Vašej pohľadávky
č. <strong>${caseReference}</strong> vo výške <strong>${amount}</strong>, splatnej dňa ${dueDate}.
Žiadame Vás o úhradu dlžnej sumy alebo o kontaktovanie agentúry za účelom dohody o splátkach.</p>`,
    EN: `<h1>${title}</h1>
<p>Dear ${debtorName},</p>
<p>The collection agency <strong>${agencyName}</strong> has been engaged to recover your claim
no. <strong>${caseReference}</strong> in the amount of <strong>${amount}</strong>, due on ${dueDate}.
Please settle the outstanding amount or contact the agency to arrange an installment plan.</p>`,
  };

  return { title, html: renderLayout(title, bodyByLang[lang], lang) };
}

function renderByType(
  type: DocumentType,
  language: TemplateLanguage,
  inputs: Record<string, unknown>,
): { title: string; html: string } {
  switch (type) {
    case "MANDATE":
      return mandate({ ...inputs, language } as MandateInputs);
    case "GDPR_NOTICE":
      return gdprNotice({ ...inputs, language } as GdprNoticeInputs);
    case "AWARD_CONTRACT":
      return awardContract({ ...inputs, language } as AwardContractInputs);
    case "SETTLEMENT":
    case "INSTALLMENT_PLAN":
      return settlement({ ...inputs, language } as SettlementInputs);
    case "PAYMENT_RECEIPT":
      return renderReceipt(inputs as unknown as ReceiptInputs, language);
    case "DEBTOR_NOTICE":
      return renderDebtorNotice(inputs as unknown as DebtorNoticeInputs, language);
    default:
      throw new Error("template not implemented: " + type);
  }
}

export async function generateDocument(i: {
  caseId?: string;
  orgId?: string;
  type: DocumentType;
  language: TemplateLanguage;
  countryCode: string;
  inputs: Record<string, unknown>;
}): Promise<GeneratedDocument> {
  const templateId = TEMPLATE_IDS[i.type];
  if (!templateId) throw new Error("template not implemented: " + i.type);

  const row = await db.generatedDocument.create({
    data: {
      caseId: i.caseId,
      type: i.type,
      templateId,
      language: i.language,
      objectKey: "",
      sha256: "",
      inputs: i.inputs as object,
    },
  });

  try {
    const rendered = renderByType(i.type, i.language, i.inputs);
    const html = rendered.html
      .replace("{{DOCUMENT_ID}}", row.id)
      .replace("{{GENERATED_AT}}", new Date().toISOString());

    const { content, contentType, ext } = await providers(i.countryCode).renderer.render(html);
    const sha256 = sha256hex(content);
    const objectKey = i.caseId
      ? `case/${i.caseId}/docs/${row.id}.${ext}`
      : `org/${i.orgId}/docs/${row.id}.${ext}`;

    await storage.put(objectKey, content, contentType);

    return await db.generatedDocument.update({
      where: { id: row.id },
      data: { objectKey, sha256 },
    });
  } catch (err) {
    await db.generatedDocument.delete({ where: { id: row.id } }).catch(() => {});
    throw err;
  }
}
