import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { Wireframe } from "@/components/wireframe";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <header className="flex items-stretch border-b border-rule">
        <Link
          href={`/${locale}`}
          className="flex items-center px-5 py-4 font-display text-lg font-medium tracking-[-0.01em]"
        >
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <span className="hidden items-center border-l border-rule px-5 text-[12px] tracking-[0.04em] text-ink/70 sm:flex">
          {t(dict, "landing.title", {}, locale)}
        </span>
        <span className="ml-auto flex items-center border-l border-rule px-5 font-mono text-[12px] tracking-[0.06em]">
          0003 / {t(dict, "auth.signup", {}, locale)}
        </span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative hidden flex-[2] items-center justify-center border-r border-rule lg:flex">
          <Wireframe className="w-[min(420px,60%)] text-accent" />
          <span
            className="absolute bottom-6 left-6 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/40"
            aria-hidden
          >
            A002
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-10 px-6 py-16 lg:px-14">
          <h1 className="font-display text-[clamp(48px,7vw,90px)] font-medium leading-[0.85] tracking-[-0.03em]">
            {t(dict, "auth.signup", {}, locale)}.
          </h1>
          <SignupForm dict={dict} locale={locale} />
          <p className="text-[12px] tracking-[0.04em] text-ink/70">
            {t(dict, "auth.protectedNote", {}, locale)} · © {t(dict, "common.appName", {}, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}
