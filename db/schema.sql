-- PostgreSQL / Supabase Schema

-- Custom ENUM types
CREATE TYPE material_category_enum AS ENUM (
    'PCB_HIGH_GRADE',
    'CRT_GLASS',
    'LI_ION_BATTERY',
    'MIXED_EWASTE'
);

CREATE TYPE transaction_status_enum AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

-- Table: collector_aliases
CREATE TABLE IF NOT EXISTS collector_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_code VARCHAR UNIQUE NOT NULL,
    preferred_lang VARCHAR(10) DEFAULT 'en',
    trust_score DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: scrap_transactions
CREATE TABLE IF NOT EXISTS scrap_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_alias_id UUID REFERENCES collector_aliases(id) ON DELETE RESTRICT,
    material_category material_category_enum NOT NULL,
    raw_weight_kg DECIMAL(10,3) NOT NULL,
    completeness_index DECIMAL(5,2),
    density_anomaly_flag BOOLEAN DEFAULT FALSE,
    final_payout_amt DECIMAL(15,2),
    status transaction_status_enum DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: cpcb_yield_certificates
CREATE TABLE IF NOT EXISTS cpcb_yield_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES scrap_transactions(id) ON DELETE CASCADE,
    recovered_copper_kg DECIMAL(10,3) NOT NULL DEFAULT 0.0,
    recovered_precious_metals_kg DECIMAL(10,3) NOT NULL DEFAULT 0.0,
    recovered_plastics_kg DECIMAL(10,3) NOT NULL DEFAULT 0.0,
    inert_residue_kg DECIMAL(10,3) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_collector_aliases_alias_code ON collector_aliases(alias_code);
CREATE INDEX IF NOT EXISTS idx_scrap_transactions_status ON scrap_transactions(status);
