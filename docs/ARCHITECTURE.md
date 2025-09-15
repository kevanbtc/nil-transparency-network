# NIL Transparency Network — Complete Component Catalog

## A) Smart Contracts (On-Chain)

### A1. Core NIL Primitives

* **NILVault (ERC-6551 Account)**
  Athlete-scoped smart account; holds funds, enforces compliance gates, emits deal events, links to off-chain KYC status.
* **RevenueSplitter**
  Deterministic payout contract for athlete/agent/school/brand/tax wallets; supports time-locks, cliffs, and rev-share schedules.
* **ContractNFT (Deal Tokenization)**
  Mints one NFT per NIL contract; stores IPFS terms hash, jurisdiction, status; pairs with vault to authorize payouts.
* **ComplianceRegistry**
  On-chain registry of KYC/AML attestations, sanctions checks, tax profile references, and approval flags per deal/address.
* **DeliverablesOracleRouter**
  Pluggable oracle verifier for "proof of deliverables" (e.g., post published, stream completed). Writes result to ContractNFT status.

### A2. Finance & Settlement

* **StablecoinBridgeAdapter(s)**
  Whitelisted bridges for fiat→stablecoin→NIL token flows; records FX rate, chain, and proof ref.
* **RWAPool / RWAVault**
  Tokenized sponsorship pools and receivables; issues LP tokens; enforces whitelist and lockups.
* **BoosterPool**
  Transparent donor/booster funding pool; routes through RevenueSplitter; enforces compliance (no disbursements without approvals).
* **Escrow & DisputeResolution**
  Holds funds until deliverables or arbitration; supports split outcomes and partial refunds.

### A3. Reputation & Governance

* **ReputationScore (Soulbound or Attested)**
  Aggregates athlete success (stats, engagement), loyalty (on-time delivery), and dispute history; updatable via oracle attestations.
* **AdapterStaking & Slashing**
  Integration providers (Opendorse/INFLCR/etc.) stake to publish events; misbehavior gets slashed.
* **RBAC & PolicyManager**
  Fine-grained roles (athlete, agent, school officer, brand officer, compliance officer); upgradeable policy rules per jurisdiction.

### A4. Integration Adapters (Per-Platform)

* **OpendorseAdapter / INFLCRAdapter / BasepathAdapter / AthlianceAdapter**
  Canonical mappers from partner webhooks/APIs → ContractNFT + ComplianceRegistry updates + NILVault hooks.
* **ISO20022Emitter**
  Emits on-chain references for payment messages (IDs, hashes); pairs with off-chain generator for the full XML.

---

## B) Off-Chain Infrastructure (National & Global)

### B1. Application Layer (SiloCloud)

* **Athlete Super-App**
  Vault balance, pending deals, tax forms, deliverables checklist, merch/livestream/ tips, withdrawal rails.
* **University Compliance Portal**
  Real-time roster view, approvals queue, booster inflow tracking, audits, and export tools.
* **Brand & Agency Console**
  Deal onboarding, deliverables tracker, ROI analytics, invoice and payout status.
* **Booster/Donor Console**
  Verified contributions, earmarking, receipts, and transparency reports.

### B2. Finance & Banking (SiloBank)

* **Fiat On/Off-Ramp Orchestrator**
  ACH/wire/card → stablecoin; stablecoin → ACH/wire; tracks KYB/KYC and Travel Rule metadata.
* **Treasury & FX Service**
  Multicurrency balances, hedging hooks, rate capture, and reconciliation to on-chain events.
* **Payout Engine**
  Mass payouts to bank accounts, stablecoin addresses, or custodial wallets; retries, chargeback handling.

### B3. Data & Integrations

* **Partner Adapters**
  Opendorse/INFLCR/Basepath/Athliance webhook receivers; schema mappers; idempotent upserts.
* **Stats & Engagement Ingest**
  Sports data providers + social APIs; normalizes into reputation inputs.
* **KYC/KYB/AML Providers**
  Pluggable vendors; writes attestations to ComplianceRegistry (hash+timestamp+issuer DID).

### B4. Platform Services

* **Compliance Engine**
  Rule evaluation per jurisdiction; blocks disbursements until green; explains failures.
* **ISO 20022 Message Service**
  Builds pacs.008/pain.001/camt.\* messages; stores signed XML + hash ref on-chain.
* **Document & Evidence Store**
  Terms, invoices, deliverable proofs in IPFS/S3 with content hashes recorded on-chain.
* **Observability & Security**
  SIEM, audit logs, anomaly detection, HSM/MPC key management, secrets vault, policy as code.

### B5. Core SRE/DevOps

* **Environments**
  Dev / Staging / Prod (regionally sharded for data residency).
* **CI/CD**
  Contract audits, migration gates, canary deploys, contract registry with version pins.
* **Monitoring**
  Uptime, event lag, payout SLA, oracle freshness, chain reorg protection.

---

## C) Compliance & Regulatory Modules

### C1. U.S. (National)

* **NCAA/State NIL Rules Engine**
  School pre-approval workflows, booster rules enforcement, prohibited activity checks.
* **IRS Reporting**
  TIN collection, W-9/W-8BEN capture, 1099/withholding logic; export packages for filing.
* **OFAC/FinCEN**
  Sanctions screening, AML red-flag rules, SAR escalation workflows, Travel Rule data exchange (for VASPs).

### C2. EU & UK

* **GDPR Compliance**
  Lawful basis registry, DSR handling (access/erasure), data minimization, DPIAs.
* **PSD2/Open Banking**
  Payment initiation via regulated providers; SCA flows; audit trails.
* **Sanctions & AML**
  EU/UK lists, PEP screening, source-of-funds capture.

### C3. APAC / LATAM / Global

* **Data Residency Controls**
  Region-pinned stores; cross-border transfer guardrails with SCCs.
* **Tax/VAT/GST Modules**
  Country-specific rates, invoices, and export formats.
* **Local KYC/KYB**
  National ID/passport checks, address verification, watchlists.

---

## D) Transparency & Auditability

### D1. Immutable Trails

* **On-Chain Events**
  `DealCreated`, `ComplianceApproved`, `DeliverableVerified`, `PayoutExecuted`, `ISO20022RefEmitted`.
* **Merkle Receipts**
  Each report bundle (CSV/PDF/XML) anchored on-chain; verifiable by any stakeholder.
* **Open Attestations**
  KYC/AML/Stats oracles sign results; verifier contracts check issuer DIDs and revocation lists.

### D2. Stakeholder Views

* **Athlete**
  "Where did my money come from? Who took what cut? What's pending and why?"
* **Agent**
  Pipeline, commissions, compliance blockers, deliverables schedule.
* **School**
  Booster inflows, approvals, audits, NCAA rules posture.
* **Brand**
  Spend vs. outcome, deliverable proof links, ROI analytics, payment receipts.
* **Regulator/Auditor**
  Read-only dataset + hashes; sampling tools; export of ISO 20022 and tax bundles.

### D3. Anti-Tamper & Safety

* **Two-Man Rule for Policy Changes**
  Admin actions require multi-sig; changes logged and anchored.
* **Dispute Ledger**
  Claims, evidence, arbitrator decision; affects reputation and unlocks escrow.
* **Rate-Limiters & Anomaly Detection**
  Detect wash funding, circular flows, or suspicious payout patterns.

---

## E) Minimal "Core Protocol" (the indispensable primitives)

If you had to ship the smallest usable standard that everything else can plug into:

1. **Deal = ContractNFT + TermsHash + Jurisdiction + Parties**
   Canonical schema everyone speaks.
2. **Payment = RevenueSplitter**
   Deterministic, observable payouts with role-based destinations.
3. **Identity & Compliance = ComplianceRegistry**
   Attestations for KYC/AML/tax + approval gates referenced by vaults/splitters.
4. **Account = NILVault (ERC-6551)**
   Athlete-scoped programmable account enforcing policy and emitting events.
5. **Attestation Oracles**
   Deliverables, stats, sanctions, and tax confirmations signed by accredited issuers.

Everything else is comfort food and scale.

---

## F) How This Fixes the Real-World Mess (glue summary)

* **Shadow money** becomes traceable: every cent traverses a splitter under a green compliance light.
* **Interoperability** stops being a promise: adapters normalize the world into one contract schema.
* **Global expansion** becomes sane: jurisdiction packs gate payouts and reporting per region.
* **Fair pay** is enforceable: deliverables and success feed reputation, which influences terms and access.
* **Audits** downgrade from "multi-week panic" to "click export."

---

## G) Next Concrete Steps (so it's real this quarter)

1. **Lock the Core Schemas**
   ContractNFT JSON schema, RevenueSplitter config format, ComplianceRegistry attestation types.
2. **Ship 2 Adapters First**
   Opendorse + INFLCR end-to-end (deal → NFT → approvals → payout → ISO 20022).
3. **U.S. Compliance Pack v1**
   NCAA/state guardrails + IRS minimal reporting; OFAC screening live.
4. **SiloBank On-Ramp**
   ACH/wire in; stablecoin out; Travel Rule messaging wired.
5. **Dashboards M0**
   Athlete + University MVP with exportable audit bundles; brand ROI page.

---

*This catalog provides a modular, end-to-end view of every moving part in the NIL Transparency Network. Adopt pieces without ripping up what you've already built.*