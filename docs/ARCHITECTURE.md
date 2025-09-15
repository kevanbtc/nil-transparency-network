# NIL Transparency Network — Enterprise Overview (Contracts • Infra • Compliance • Transparency)

## 1) Smart contracts (canonical set)

**Core**

* `NILVault` (ERC-6551): Athlete smart account; enforces compliance gates, emits lifecycle events.
* `ContractNFT`: One token per NIL agreement; stores `termsHash`, `jurisdiction`, `status`.
* `RevenueSplitter`: Deterministic, role-aware payouts (athlete/agent/school/brand/tax).
* `ComplianceRegistry`: Attestations for KYC/KYB/AML/tax; approval flags referenced by vault & splitter.
* `PolicyManager` (RBAC): Role bindings + upgradable rule sets per jurisdiction.

**Finance / Settlement**

* `StablecoinBridgeAdapter`: Whitelisted bridges & on/off-ramp receipts (fxRate, chain, proofRef).
* `RWAPool` / `RWAVault`: Tokenized sponsor pools & receivables; whitelist + lockups; LP tokens.
* `BoosterPool`: Transparent boosters → RevenueSplitter; compliance block if not greenlit.
* `Escrow` + `DisputeResolution`: Funds held until deliverables or arbitration outcome.

**Reputation & Oracles**

* `ReputationScore` (soulbound or attested): success + loyalty + dispute signals.
* `DeliverablesOracleRouter`: Verifies "proof of deliverables" (content posted, stream completed).
* `AdapterStaking`: Adapters stake; slashing on malformed/malicious integration events.

**Adapters (per platform)**

* `OpendorseAdapter`, `INFLCRAdapter`, `BasepathAdapter`, `AthlianceAdapter`: Canonical mappers → `DealCreated`, `ComplianceUpdated`, `DeliverableVerified`, `PayoutExecuted`.
* `ISO20022Emitter`: Emits on-chain references (messageId, hash) corresponding to off-chain XML.

> **Event canon (emit from the above):**
> `DealCreated(dealId, athlete, brand, amount, termsHash)`
> `ComplianceApproved(dealId, approver, timestamp)`
> `DeliverableVerified(dealId, oracle, result)`
> `PayoutExecuted(dealId, splitter, amounts[])`
> `ISO20022RefEmitted(dealId, messageType, messageId, hash)`

---

## 2) Off-chain infrastructure (national & global)

**SiloCloud (human interface layer)**

* Athlete Super-App: vault, deals, deliverables checklist, fiat↔stablecoin, tax docs.
* University Compliance Portal: roster, approvals queue, booster flows, NCAA/state packs, exports.
* Brand/Agency Console: deal onboarding, ROI analytics, invoicing, receipts.
* Booster Console: verified contributions, earmarks, receipts, transparency reports.

**SiloBank**

* Fiat on/off-ramp orchestrator (ACH/wire/card → stablecoin; stablecoin → ACH/wire).
* Treasury & FX (multi-currency, hedging hooks, marked rates).
* Payout engine (bank accounts, stablecoin, custodial wallets) with retries & reconciliation.

**Data & Integrations**

* Partner adapters (webhooks/APIs) → idempotent upserts.
* Sports/social ingest → normalized metrics → `ReputationScore`.
* KYC/KYB/AML vendors → signed attestations → `ComplianceRegistry`.

**Platform services**

* Compliance Engine: rule evaluation per jurisdiction; blocks non-compliant disbursement with human-readable reasons.
* ISO 20022 Service: builds pacs.008/pain.001/camt.* XML; signs & anchors hash on-chain via `ISO20022Emitter`.
* Document/Evidence store: IPFS/S3; store `terms.pdf`, invoices, proof assets; content-hash on-chain.
* Observability/Security: SIEM, anomaly detection, HSM/MPC, secret vault, audit trails.

**SRE/DevOps**

* Environments: dev/staging/prod (region-sharded for data residency).
* CI/CD: contract audits, migrations, canary deploys; contract registry with version pins.
* Monitoring: event lag, payout SLA, oracle freshness, chain reorg guards.

---

## 3) Compliance & transparency (U.S. & global)

**U.S.**

* NCAA & state packs: pre-approval flows, prohibited-activity checks, booster rules.
* IRS: W-9 / W-8BEN capture, 1099 logic, withholding, export bundles.
* OFAC/FinCEN: sanctions screening, AML red-flags, Travel Rule payloads for VASP transfers.

**EU/UK**

* GDPR: lawful-basis registry, DSR workflows, minimization, DPIAs.
* PSD2/Open Banking: PISPs, SCA, audit trails.
* EU/UK Sanctions & PEP screening; SoF/SoW capture.

**APAC/LATAM/global**

* Data residency controls (region-pinned stores, SCCs).
* VAT/GST modules; localized invoices & exports.
* National KYC/KYB (passport, eID), address verification, watchlists.

**Transparency primitives**

* Immutable event feed (see canon above).
* Merkle receipts for report bundles (CSV/PDF/XML) → anchored on-chain.
* Open Attestations (DIDs, revocation lists) for KYC/AML/stats oracles.

---

## 4) How SiloCloud makes it "real"

SiloCloud is the **operational surface**: it turns contract events into workflows and compliance states into buttons. It:

* Drives **deal lifecycles** (create → approve → verify → payout).
* Orchestrates **money movement** via SiloBank while anchoring **proofs on-chain**.
* Gives **role-specific views** so athletes/agents/schools/brands/boosters/regulators see *their* slice, with shared truth underneath.

---

## 5) Production Infrastructure

### Database Schema

The system uses PostgreSQL with the following core tables:

- `athletes`: Athlete profiles and wallet information
- `deals`: NIL deal records with on-chain references
- `payouts`: Transaction records for completed payments
- `attestations`: Compliance and verification records
- `boosters`: Verified booster/sponsor information
- `booster_contributions`: Tracking of booster contributions

### API Endpoints

**Core Deal Management:**
- `POST /api/deals` - Create new NIL deal
- `POST /api/deals/{dealId}/approve` - Approve deal compliance
- `POST /api/payouts/{dealId}` - Execute payout

**Event Processing:**
- `DealCreated` → insert deals (status=CREATED)
- `ComplianceApproved` → update deals.status=APPROVED; insert attestations
- `DeliverableVerified` → update deals.status=VERIFIED
- `PayoutExecuted` → insert payouts; update deals.status=PAID
- `ISO20022RefEmitted` → attach tx_ref to payouts

### Security & Compliance

**Threat Mitigation:**
- Adapter staking and validation for external integrations
- Multi-signature requirements for fund distribution
- Replay protection and confirmation thresholds
- Regional data residency controls

**Compliance Guardrails:**
- Hard stops for missing attestations or expired KYC
- Sanctions screening integration
- ISO 20022 compliance reporting
- Full audit trail with Merkle proofs

---

## 6) Development Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 14+
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/kevanbtc/nil-transparency-network.git
cd nil-transparency-network

# Install dependencies
npm install

# Set up environment
cp infra/contracts.env.example .env
# Edit .env with your configuration

# Compile smart contracts
npm run compile

# Run tests
npm test

# Start development server
npm run dev
```

### CI/CD Pipeline

The repository includes GitHub Actions workflows for:
- Smart contract compilation and testing
- API service linting and testing
- Database migration testing
- Deployment automation

### Environment Configuration

Key environment variables (see `infra/contracts.env.example`):
- `RPC_SEPOLIA` - Ethereum testnet RPC URL
- `PRIVATE_KEY` - Deployment private key
- Contract addresses for deployed infrastructure

---

This architecture provides the foundation for a production-ready NIL transparency network that can scale globally while maintaining compliance and auditability.