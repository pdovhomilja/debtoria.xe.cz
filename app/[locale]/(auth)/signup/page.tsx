import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">{t(dict, "auth.signup", {}, locale)}</h1>
      <SignupForm dict={dict} locale={locale} />
    </div>
  );
}
