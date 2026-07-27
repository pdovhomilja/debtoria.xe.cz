# 11 — Security & Infrastructure

> Purpose: protect highly sensitive financial/personal data, meet GDPR's security bar, and run
> reliably on self‑hosted Coolify infrastructure.

## 1. Threat model (what we're protecting)

**Assets:** debtor & creditor PII, evidence documents, **signed legal contracts** (court
evidence), payment/financial records, credentials, audit trail.

**Top threats:**
- Data breach / PII exfiltration (GDPR‑catastrophic, reputational).
- Broken access control (creditor sees another's case; agency sees pre‑award PII).
- Tampering with signed documents or audit logs.
- Account takeover (creditor, **agency**, or **admin** — admin is highest value).
- Fraudulent cases / money‑laundering via the platform.
- Supply‑chain (dependency, integration provider compromise).
- Insider misuse (admin impersonation without audit).

## 2. AuthN / AuthZ

- **Authentication:** secure sessions; **MFA mandatory for Admin and Agency**, offered to
  creditors; strong password policy; rate‑limited login; breach‑password checks.
- **Authorization:** **RBAC** (Creditor / Agency / Admin / Support) **plus per‑resource ownership
  checks on every query** — never rely on role alone. Deny‑by‑default.
- **Pre‑award redaction:** debtor PII is not returned to agencies until award — enforce at the
  data‑access layer, not just the UI.
- **Debtor portal:** capability‑based **signed, expiring tokens** (no account); scoped to one case.
- **Admin actions & impersonation:** always logged to the immutable audit trail with reason.

## 3. Data protection

- **Encryption in transit:** TLS everywhere (Coolify/Traefik‑terminated), HSTS.
- **Encryption at rest:** full‑disk + DB encryption; **column‑level encryption** (`pgcrypto`/app‑
  layer) for special‑category data and KYC payloads; MinIO server‑side encryption.
- **Secrets:** Coolify secret store / env; never in git; rotate; separate per environment.
- **PII minimisation & pseudonymisation** where possible; **redaction** in listings, logs, exports.
- **Signed documents:** WORM/object‑lock in MinIO; SHA‑256 recorded; tamper‑evident.
- **Audit log:** append‑only table; consider hash‑chaining for tamper evidence; no deletes.
- **Data residency:** all stores/processors in the **EU**; verify each vendor's region.

## 4. Application security

- Input validation everywhere (shared schema client/server); output encoding; parameterized
  queries (Prisma) — no raw string SQL with user input.
- CSRF protection on mutations; secure/HttpOnly/SameSite cookies; strict CSP; security headers.
- File uploads: type/size limits, **malware scanning**, store outside webroot (MinIO), never
  execute; serve via pre‑signed URLs.
- Rate limiting + bot protection on public/auth/submission endpoints.
- Dependency scanning (SCA), SAST, secret scanning in CI; pinned deps; regular updates.
- Webhook security: verify signatures from QTSP/PSP/KYC; idempotency keys.
- Tenant isolation verified by automated tests (creditor A cannot reach creditor B's data).

## 5. Reliability & operations

- **Services (Coolify):** `web`, `worker`, `postgres`, `minio`, (optional `redis`), reverse proxy.
- **Backups:**
  - Postgres: automated daily (or more) dumps + PITR if available; **encrypted**, stored
    **off‑box** in a second location; **test restores** regularly.
  - MinIO: replication/snapshots to a second location; lifecycle rules; object‑lock preserved.
  - **Document restore drills** — signed contracts must be recoverable.
- **DR:** documented RTO/RPO; runbook; second region/host for critical data.
- **Migrations:** `prisma migrate deploy` as a release step; forward‑only; backup before migrate.
- **Zero‑downtime deploys** where feasible; health checks; graceful worker shutdown (drain jobs).
- **Job reliability:** idempotent, retried with backoff, dead‑letter queue + alerting.

## 6. Observability

- **Logs:** structured, centralized, **PII‑scrubbed**; retention policy.
- **Metrics:** app + infra (case funnel, job queue depth, signing success rate, payment recon).
- **Tracing:** on critical paths (submission → signing → award → payment).
- **Alerting:** uptime, error rate, queue backlog, failed signings/payments, backup failures,
  security events (failed admin logins, permission‑denied spikes).
- **Uptime monitoring** external to the host.

## 7. Compliance‑driven security controls

- **DPIA** informs technical controls ([09](./09-legal-and-compliance.md)).
- **Data‑subject requests:** tooling to export/rectify/erase (bounded by legal retention).
- **Retention & purge:** automated per‑data‑type schedules.
- **Breach response:** detection → contain → assess → **72h GDPR notification** → remediate;
  runbook + on‑call.
- **Sub‑processor governance:** register, DPAs, periodic review.
- **Access reviews:** least privilege; periodic admin‑access audit; offboarding.

## 8. Environments

| Env | Purpose | Data |
|---|---|---|
| `production` | Live | Real (EU‑hosted, encrypted) |
| `staging` | Pre‑prod validation | **Synthetic/anonymized only** |
| `preview` (optional) | Per‑branch review | Synthetic |

Never copy production PII downstream. Feature flags gate country/feature rollout.

## 9. Security checklist (pre‑launch)

- [ ] MFA enforced for admin + agency.
- [ ] Per‑resource authorization tests (tenant isolation) green.
- [ ] Pre‑award PII redaction verified.
- [ ] Encryption at rest (DB + MinIO) + column encryption for sensitive fields.
- [ ] Secrets in Coolify store, rotated, not in git.
- [ ] Backups automated + **restore tested** (DB + MinIO).
- [ ] Malware scanning on uploads.
- [ ] Webhook signature verification for all integrations.
- [ ] Audit log append‑only + covering all legal/financial/admin actions.
- [ ] Dependency/SAST/secret scanning in CI.
- [ ] Breach runbook + on‑call + external uptime monitoring.
- [ ] Pen test before public launch.
