-- Initial schema for NIL Transparency Network
-- Version: 1.0.0
-- Date: 2023-09-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE eligibility_status AS ENUM ('active', 'inactive', 'graduated');
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'expired', 'rejected');
CREATE TYPE deal_status AS ENUM ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled');
CREATE TYPE platform_source AS ENUM ('opendorse', 'inflcr', 'basepath', 'silo', 'direct');
CREATE TYPE transaction_type AS ENUM ('tip', 'subscription', 'merch_purchase', 'nft_purchase', 'deal_payout', 'revenue_split');
CREATE TYPE compliance_status AS ENUM ('pending', 'approved', 'flagged');
CREATE TYPE verification_level AS ENUM ('basic', 'enhanced', 'institutional');
CREATE TYPE check_type AS ENUM ('kyc', 'aml', 'sanctions', 'deal_compliance');

-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    division VARCHAR(10) NOT NULL CHECK (division IN ('D1', 'D2', 'D3', 'NAIA', 'NJCAA')),
    conference VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'US',
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    requires_approval BOOLEAN DEFAULT true,
    max_deal_amount BIGINT DEFAULT 0,
    revenue_share_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Athletes table
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    school_id UUID REFERENCES schools(id),
    vault_address VARCHAR(42) NOT NULL UNIQUE,
    eligibility_status eligibility_status DEFAULT 'active',
    kyc_status kyc_status DEFAULT 'pending',
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    nil_subdomain VARCHAR(100) UNIQUE,
    total_earnings BIGINT DEFAULT 0,
    active_deals INTEGER DEFAULT 0,
    twitter_handle VARCHAR(255),
    instagram_handle VARCHAR(255),
    tiktok_handle VARCHAR(255),
    linkedin_handle VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NIL Deals table
CREATE TABLE nil_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id VARCHAR(66) NOT NULL UNIQUE, -- Blockchain deal ID
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    brand_name VARCHAR(255) NOT NULL,
    brand_address VARCHAR(42) NOT NULL,
    amount BIGINT NOT NULL, -- Amount in wei
    currency VARCHAR(10) DEFAULT 'ETH',
    deliverables TEXT[] NOT NULL,
    platform_source platform_source NOT NULL,
    status deal_status DEFAULT 'pending',
    athlete_split INTEGER NOT NULL DEFAULT 10000, -- Basis points
    school_split INTEGER DEFAULT 0,
    collective_split INTEGER DEFAULT 0,
    platform_split INTEGER DEFAULT 0,
    beneficiaries VARCHAR(42)[] NOT NULL,
    terms_ipfs VARCHAR(100),
    compliance_approved BOOLEAN DEFAULT false,
    compliance_notes TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (athlete_split + school_split + collective_split + platform_split <= 10000),
    CHECK (amount > 0)
);

-- Compliance Records table
CREATE TABLE compliance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES nil_deals(id),
    athlete_id UUID REFERENCES athletes(id),
    entity_address VARCHAR(42) NOT NULL,
    check_type check_type NOT NULL,
    status compliance_status DEFAULT 'pending',
    verification_level verification_level,
    jurisdiction VARCHAR(10) NOT NULL,
    reason TEXT,
    document_hash VARCHAR(66),
    checked_by VARCHAR(42) NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type NOT NULL,
    from_user VARCHAR(42),
    to_athlete UUID NOT NULL REFERENCES athletes(id),
    deal_id UUID REFERENCES nil_deals(id),
    amount BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETH',
    nil_tokens BIGINT,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    platform_fee BIGINT DEFAULT 0,
    compliance_status compliance_status DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (amount > 0)
);

-- Platforms table
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    api_base_url VARCHAR(500) NOT NULL,
    auth_type VARCHAR(50) NOT NULL,
    webhook_url VARCHAR(500),
    requests_per_minute INTEGER DEFAULT 60,
    burst_limit INTEGER DEFAULT 100,
    integration_status VARCHAR(20) DEFAULT 'pending',
    supports_deal_creation BOOLEAN DEFAULT false,
    supports_content_monetization BOOLEAN DEFAULT false,
    supports_fan_engagement BOOLEAN DEFAULT false,
    supports_analytics BOOLEAN DEFAULT false,
    platform_fee INTEGER DEFAULT 0, -- Basis points
    transaction_fee INTEGER DEFAULT 0, -- Basis points
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES platforms(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Events table (for tracking user interactions)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    athlete_id UUID REFERENCES athletes(id),
    deal_id UUID REFERENCES nil_deals(id),
    platform_source platform_source,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_athletes_vault_address ON athletes(vault_address);
CREATE INDEX idx_athletes_eligibility ON athletes(eligibility_status);
CREATE INDEX idx_athletes_kyc_status ON athletes(kyc_status);

CREATE INDEX idx_deals_athlete ON nil_deals(athlete_id);
CREATE INDEX idx_deals_status ON nil_deals(status);
CREATE INDEX idx_deals_platform ON nil_deals(platform_source);
CREATE INDEX idx_deals_created_at ON nil_deals(created_at);
CREATE INDEX idx_deals_deal_id ON nil_deals(deal_id);

CREATE INDEX idx_compliance_entity ON compliance_records(entity_address);
CREATE INDEX idx_compliance_type ON compliance_records(check_type);
CREATE INDEX idx_compliance_status ON compliance_records(status);

CREATE INDEX idx_transactions_athlete ON transactions(to_athlete);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_webhook_events_platform ON webhook_events(platform_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX idx_analytics_events_athlete ON analytics_events(athlete_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nil_deals_updated_at BEFORE UPDATE ON nil_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_records_updated_at BEFORE UPDATE ON compliance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();