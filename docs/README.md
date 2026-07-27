# Debt Recovery Marketplace — Project Documentation

> **Working title:** vymahaciagentury.cz (EU platform)
> **Status:** Discovery / specification
> **Owner:** Pavel Dovhomilja
> **Last updated:** 2026-07-01

A pan‑European, fully automated **debt‑recovery marketplace** that connects creditors
(businesses and individuals) with vetted, licensed debt‑collection agencies and law firms.
Clients submit a debt online; the platform auto‑generates every document, collects
qualified electronic signatures, runs a competitive bidding round among agencies, and
manages the case to recovery — end to end, in eight languages.

---

## 1. What we are building (in one paragraph)

The platform is a **software intermediary** (like [Debitura](https://www.debitura.com/)),
not itself a collection agency. A creditor creates an account, enters a debt, and uploads
supporting evidence. The system automatically drafts and issues the mandate/assignment
contract, GDPR and power‑of‑attorney documents, and collects **eIDAS Qualified Electronic
Signatures (QES)** from all parties. The case is then offered to the agency network, which
**competitively bids/quotes** on it; the platform admin (or a scoring algorithm) awards the
case to the best‑fit agency. The agency works the case; the platform tracks status,
handles messaging and payments, and takes a **commission on successfully recovered debt**.
A structured channel handles disputes between the parties. Everything — landing page and
app — ships in **EN, DE, CZ, SK, PL, HU, RU, UA** from day one.

## 2. Locked product decisions

| Decision | Choice | Consequence |
|---|---|---|
| **Business model** | Pure marketplace (software intermediary) | We earn a commission/lead fee on recovered debt; **no collection licence required** for us. Regulated work is done by licensed partners. |
| **Client types** | B2B **and** B2C | Two contract templates, two KYC flows, consumer‑protection layer for B2C. |
| **"Arbitration"** | Competitive bidding for cases | Agencies submit quotes; admin/algorithm awards. (Plus a lightweight dispute channel — see [12](./12-forgotten-and-risks.md).) |
| **E‑signatures** | QES everywhere (eIDAS) | Every signed document uses a qualified signature via a Qualified Trust Service Provider (QTSP). Higher cost, maximum enforceability across all 8 jurisdictions. |
| **Tech stack** | Next.js (latest), PostgreSQL, Prisma, MinIO, self‑hosted on Coolify | See [06](./06-architecture.md). |
| **Markets** | EU, launch focus CZ/SK first | 8 UI languages from launch. |

## 3. Documentation map

| # | Document | What it covers |
|---|---|---|
| — | [README.md](./README.md) | This index + executive summary |
| 01 | [Market research](./01-market-research.md) | Market size, drivers, regulatory tailwinds, TAM/SAM/SOM |
| 02 | [Competitor analysis](./02-competitor-analysis.md) | Debitura, PairFinance, coeo, InDebted, Intrum, EOS, existing site |
| 03 | [Product vision & business model](./03-product-and-business-model.md) | Value prop, roles, revenue, bidding/"arbitration" mechanics |
| 04 | [Personas & user journeys](./04-personas-and-journeys.md) | Creditor, agency, admin, debtor flows end‑to‑end |
| 05 | [Functional specification](./05-functional-spec.md) | Feature‑by‑feature requirements incl. document automation & QES |
| 06 | [System architecture](./06-architecture.md) | Stack, services, jobs, storage, integrations, Coolify deploy |
| 07 | [Data model](./07-data-model.md) | Entities + draft Prisma schema |
| 08 | [Document automation & e‑signature](./08-documents-and-esignature.md) | Template engine, PDF generation, QES flow, timestamping |
| 09 | [Legal & compliance](./09-legal-and-compliance.md) | GDPR, eIDAS, CSD 2021/2167, per‑country notes, AML/KYC |
| 10 | [Internationalization](./10-internationalization.md) | 8 languages, routing, legal‑template localization |
| 11 | [Security & infrastructure](./11-security-and-infra.md) | Threat model, data protection, backups, observability |
| 12 | [What you may have forgotten + risks](./12-forgotten-and-risks.md) | Proactive gaps, open questions, risk register |
| 13 | [Roadmap & MVP](./13-roadmap-and-mvp.md) | Phased plan, MVP scope, milestones |

## 4. Executive summary

- **The opportunity.** European debt‑collection is large, fragmented, and mostly analogue.
  The EU debt‑collection **software** market alone was ~USD 1.0B (2019) heading to ~USD 2.2B
  by 2027 (~11% CAGR); the broader services market is tens of billions. Most creditors —
  especially SMEs and consumers — have no easy, transparent way to pick a good agency. Our
  current site (vymahaciagentury.cz) already proves the demand: it manually matches Czech
  creditors to agencies for free. This project **productizes and automates** that into a
  scalable, multi‑country platform.
- **The wedge.** A **no‑cure‑no‑pay marketplace** removes the creditor's risk (pay only on
  recovery) and the agency's cold‑start problem (inbound, pre‑qualified cases). Competitive
  bidding drives price down for creditors and keeps agencies honest.
- **The moat.** (1) Full automation (document generation + QES) collapses days of paperwork
  into minutes; (2) a growing, rated agency network per jurisdiction; (3) multilingual reach
  across 8 languages that incumbents don't cover; (4) accumulated performance data that makes
  routing smarter over time.
- **The risk to manage.** Regulatory nuance per country, GDPR (we process debtor personal
  data), and QES cost/UX. All addressed in [09](./09-legal-and-compliance.md) and
  [12](./12-forgotten-and-risks.md).

## 5. How to use these docs

Read in order for a full picture. If you only read three: **03 (business model)**,
**05 (functional spec)**, **12 (what you forgot + risks)**. Engineers start at **06**, **07**,
and **08**.

> **Note on the stack:** per the repo's `AGENTS.md`, this Next.js version has breaking
> changes vs. training data. All architecture in [06](./06-architecture.md) is described at a
> design level; before writing code, read the bundled guides in `node_modules/next/dist/docs/`.
