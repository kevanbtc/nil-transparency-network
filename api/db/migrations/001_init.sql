create table athletes (
  id uuid primary key,
  wallet_address text unique not null,
  vault_address text unique not null,
  country_code text not null,
  created_at timestamptz default now()
);

create table deals (
  id uuid primary key,
  chain_deal_id text unique not null,
  contract_nft_id text not null,
  athlete_id uuid references athletes(id),
  brand_address text not null,
  amount_wei numeric(78,0) not null,
  terms_hash text not null,
  jurisdiction text not null,
  status text not null check (status in ('CREATED','APPROVED','VERIFIED','PAID','DISPUTED')),
  created_at timestamptz default now()
);

create table payouts (
  id uuid primary key,
  deal_id uuid references deals(id),
  splitter_address text not null,
  tx_hash text not null,
  amounts jsonb not null,
  executed_at timestamptz not null
);

create table attestations (
  id uuid primary key,
  subject_type text not null, -- 'ATHLETE'|'DEAL'
  subject_id text not null,   -- vault or chain deal id
  type text not null,         -- 'KYC','KYB','AML','SANCTIONS','DELIVERABLES','TAX'
  issuer_did text not null,
  payload_hash text not null,
  issued_at timestamptz not null,
  valid_until timestamptz,
  unique(subject_type, subject_id, type, issuer_did)
);

create table boosters (
  id uuid primary key,
  name text,
  verified boolean default false,
  created_at timestamptz default now()
);

create table booster_contributions (
  id uuid primary key,
  booster_id uuid references boosters(id),
  target_vault text not null,
  rwas_pool_address text,
  amount_currency text not null,
  amount numeric not null,
  source_of_funds jsonb,
  tx_ref text,
  created_at timestamptz default now()
);

create index deals_chain_deal_idx on deals(chain_deal_id);
create index att_subj_idx on attestations(subject_id);