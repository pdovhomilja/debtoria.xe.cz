import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded border p-4 ${className}`}>{children}</div>;
}

const badgeTones = {
  default: "bg-zinc-100 text-zinc-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
} as const;

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full border-collapse text-left text-sm">{children}</table>;
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
