import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[5px] border border-rule bg-paper p-5 ${className}`}>{children}</div>;
}

const badgeTones = {
  default: "bg-accent",
  success: "bg-signal-green",
  warning: "bg-signal-yellow",
  danger: "bg-signal",
} as const;

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em]">
      <span className={`size-2 shrink-0 self-center ${badgeTones[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-left text-sm [&_th]:border-b [&_th]:border-ink [&_th]:py-2 [&_th]:pr-4 [&_th]:font-mono [&_th]:text-[11px] [&_th]:font-normal [&_th]:uppercase [&_th]:tracking-[0.14em] [&_td]:border-b [&_td]:border-rule [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top">
      {children}
    </table>
  );
}

const successTones = new Set(["RECOVERED", "PARTIALLY_RECOVERED", "SETTLED", "AWARDED", "OPEN_FOR_BIDS"]);
const dangerTones = new Set(["CANCELLED", "UNRECOVERABLE", "DISPUTED", "EXPIRED_NO_BIDS"]);
const warningTones = new Set(["PENDING_SIGNATURE", "PENDING_VALIDATION", "LEGAL_ESCALATION", "PAUSED"]);

export function statusTone(status: string): keyof typeof badgeTones {
  if (successTones.has(status)) return "success";
  if (dangerTones.has(status)) return "danger";
  if (warningTones.has(status)) return "warning";
  return "default";
}
