import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wireframe } from "@/components/wireframe";
import "./landing.css";

// The product's real case-status progression — the warm teaser panel renders
// these localized, in lifecycle order, as a numbered index.
const LIFECYCLE = [
  "OPEN_FOR_BIDS",
  "BIDDING_CLOSED",
  "AWARDED",
  "IN_COLLECTION",
  "RECOVERED",
] as const;

export default async function LandingPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const marqueeText = t(dict, "landing.title", {}, locale);

  return (
    <div className="hl flex flex-1 flex-col">
      {/* Segmented top bar — hairline-divided segments, lab style */}
      <header className="hl-bar">
        <span className="hl-wordmark">{t(dict, "common.appName", {}, locale)}</span>
        <span className="hl-bar-tag">{t(dict, "landing.title", {}, locale)}</span>
        <span className="hl-bar-fill" aria-hidden />
        <nav className="hl-bar-nav">
          <a href="#how">
            <span aria-hidden>+ </span>
            {t(dict, "landing.howItWorks.title", {}, locale)}
          </a>
          <a href="#pricing">
            <span aria-hidden>+ </span>
            {t(dict, "landing.nav.pricing", {}, locale)}
          </a>
        </nav>
        <span className="hl-bar-seg hl-bar-lang">
          <LanguageSwitcher />
        </span>
        <Link href={`/${locale}/login`} className="hl-bar-seg">
          {t(dict, "auth.login", {}, locale)}
        </Link>
        <Link href={`/${locale}/signup`} className="hl-bar-cta">
          {t(dict, "landing.ctaCreditor", {}, locale)}
        </Link>
      </header>

      {/* Hero — oversized wordmark statement left, wireframe + CTA tiles right */}
      <section className="hl-hero">
        <h1>{t(dict, "landing.title", {}, locale)}</h1>
        <div className="hl-hero-side">
          <Wireframe className="hl-hero-wire" />
          <div className="hl-tiles">
            <Link href={`/${locale}/signup`} className="hl-tile hl-tile--navy">
              <span>{t(dict, "landing.ctaCreditor", {}, locale)}</span>
              <span className="hl-tile-arrow" aria-hidden>→</span>
            </Link>
            <Link href={`/${locale}/signup`} className="hl-tile hl-tile--blue">
              <span>{t(dict, "landing.ctaAgency", {}, locale)}</span>
              <span className="hl-tile-arrow" aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Case lifecycle — warm teaser panel as a numbered index */}
      <section className="hl-teaser">
        <span className="hl-label">{t(dict, "landing.hero.lifecycle", {}, locale)}</span>
        <ol className="hl-teaser-list">
          {LIFECYCLE.map((key, i) => (
            <li key={key} className={i === LIFECYCLE.length - 1 ? "is-final" : undefined}>
              <span className="hl-n" aria-hidden>0{i + 1} /</span>
              <span>{t(dict, `common.status.${key}`, {}, locale)}</span>
            </li>
          ))}
        </ol>
        <span className="hl-teaser-count" aria-hidden>01 / 05</span>
      </section>

      {/* Statement — the manifesto sentence, near edge-to-edge */}
      <section className="hl-statement">
        <p>{t(dict, "landing.subtitle", {}, locale)}</p>
      </section>

      {/* How it works — numbered index rows, creditor/agency in parallel */}
      <section id="how" className="hl-section">
        <div className="hl-section-head">
          <span className="hl-label">{t(dict, "landing.howItWorks.title", {}, locale)}</span>
          <span className="hl-label" aria-hidden>(3)</span>
        </div>
        <ol className="hl-index">
          {(["step1", "step2", "step3"] as const).map((step, i) => (
            <li key={step} className="hl-index-row">
              <span className="hl-n" aria-hidden>{i + 1}</span>
              <dl className="hl-index-body">
                <div>
                  <dt>{t(dict, "landing.howItWorks.creditorTitle", {}, locale)}</dt>
                  <dd>{t(dict, `landing.howItWorks.creditor.${step}`, {}, locale)}</dd>
                </div>
                <div>
                  <dt>{t(dict, "landing.howItWorks.agencyTitle", {}, locale)}</dt>
                  <dd>{t(dict, `landing.howItWorks.agency.${step}`, {}, locale)}</dd>
                </div>
              </dl>
              <span className="hl-arrow" aria-hidden>→</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing — no-cure statement + ruled fee bands */}
      <section id="pricing" className="hl-section">
        <div className="hl-section-head">
          <span className="hl-label">{t(dict, "landing.fee.title", {}, locale)}</span>
        </div>
        <p className="hl-statement-sm">{t(dict, "landing.fee.noCurePay", {}, locale)}</p>
        <p className="hl-lede">{t(dict, "landing.fee.subtitle", {}, locale)}</p>
        <ol className="hl-index hl-index--bands">
          {(["band1", "band2", "band3"] as const).map((band, i) => (
            <li key={band} className="hl-index-row">
              <span className="hl-n" aria-hidden>{i + 1}</span>
              <h3>{t(dict, `landing.fee.${band}Label`, {}, locale)}</h3>
              <p>{t(dict, `landing.fee.${band}`, {}, locale)}</p>
            </li>
          ))}
        </ol>
        <p className="hl-footnote">{t(dict, "landing.fee.disclaimer", {}, locale)}</p>
      </section>

      {/* Trust — compliance as a hairline footnote row */}
      <section id="trust" className="hl-section">
        <div className="hl-section-head">
          <span className="hl-label">{t(dict, "landing.trust.title", {}, locale)}</span>
          <span className="hl-label" aria-hidden>(4)</span>
        </div>
        <ul className="hl-trust-row">
          {(["qes", "gdpr", "vetted", "redaction"] as const).map((key) => (
            <li key={key}>
              <h3>{t(dict, `landing.trust.${key}Title`, {}, locale)}</h3>
              <p>{t(dict, `landing.trust.${key}Body`, {}, locale)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Dark feature panel — closing CTA, inset black block */}
      <section className="hl-dark">
        <Wireframe className="hl-dark-wire" />
        <div className="hl-dark-body">
          <h2>{t(dict, "landing.finalCta.title", {}, locale)}</h2>
          <Link href={`/${locale}/signup`} className="hl-pill hl-pill--blue">
            <span>{t(dict, "landing.ctaCreditor", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Footer — marquee tagline + numbered index */}
      <footer className="hl-foot">
        <div className="hl-marquee" aria-hidden>
          <div className="hl-marquee-track">
            <span>{marqueeText}</span>
            <span>{marqueeText}</span>
          </div>
        </div>
        <div className="hl-foot-cols">
          <ol className="hl-foot-index">
            <li>
              <span className="hl-n" aria-hidden>1</span>
              <a href="#how">{t(dict, "landing.howItWorks.title", {}, locale)}</a>
            </li>
            <li>
              <span className="hl-n" aria-hidden>2</span>
              <a href="#pricing">{t(dict, "landing.nav.pricing", {}, locale)}</a>
            </li>
            <li>
              <span className="hl-n" aria-hidden>3</span>
              <a href="#trust">{t(dict, "landing.nav.trust", {}, locale)}</a>
            </li>
            <li>
              <span className="hl-n" aria-hidden>4</span>
              <Link href={`/${locale}/privacy`}>{t(dict, "landing.footer.privacy", {}, locale)}</Link>
            </li>
          </ol>
          <div className="hl-foot-side">
            <LanguageSwitcher />
          </div>
        </div>
        <p className="hl-foot-note">
          © {t(dict, "common.appName", {}, locale)} · {t(dict, "landing.footer.sandboxDisclaimer", {}, locale)}
        </p>
      </footer>
    </div>
  );
}
