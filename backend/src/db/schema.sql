-- ══════════════════════════════════════════════════════════════════════════
-- Sales Dashboard Database Schema
-- PostgreSQL 14+
-- ══════════════════════════════════════════════════════════════════════════

-- TABLE 1: SNAPSHOT RUNS
-- Master record for each weekly snapshot execution
CREATE TABLE IF NOT EXISTS snapshot_runs (
    id                  SERIAL PRIMARY KEY,
    week_id             VARCHAR(10) NOT NULL,
    week_number         INTEGER NOT NULL,
    year                INTEGER NOT NULL,
    week_start_date     DATE NOT NULL,
    week_end_date       DATE NOT NULL,
    snapshot_date       DATE NOT NULL,
    snapshot_taken_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    duration_seconds    INTEGER,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_deals         INTEGER,
    total_value         DECIMAL(15, 2),
    deals_moved         INTEGER,
    error_message       TEXT,
    retry_count         INTEGER DEFAULT 0,
    UNIQUE(week_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_runs_week ON snapshot_runs(week_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_runs_date ON snapshot_runs(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshot_runs_status ON snapshot_runs(status);

-- TABLE 2: WEEKLY STAGE SNAPSHOTS
-- Aggregated metrics per stage per week
CREATE TABLE IF NOT EXISTS weekly_stage_snapshots (
    id                  SERIAL PRIMARY KEY,
    snapshot_run_id     INTEGER REFERENCES snapshot_runs(id) ON DELETE CASCADE,
    week_id             VARCHAR(10) NOT NULL,
    week_start_date     DATE NOT NULL,
    week_end_date       DATE NOT NULL,
    week_number         INTEGER NOT NULL,
    year                INTEGER NOT NULL,
    pipeline_id         VARCHAR(50) NOT NULL,
    pipeline_name       VARCHAR(100),
    stage_id            VARCHAR(50) NOT NULL,
    stage_name          VARCHAR(100),
    stage_category      VARCHAR(20),
    total_value         DECIMAL(15, 2) NOT NULL DEFAULT 0,
    logo_count          INTEGER NOT NULL DEFAULT 0,
    arpa                DECIMAL(15, 2),
    prev_week_value     DECIMAL(15, 2),
    prev_week_logos     INTEGER,
    prev_week_arpa      DECIMAL(15, 2),
    value_change        DECIMAL(15, 2),
    logo_change         INTEGER,
    arpa_change         DECIMAL(15, 2),
    value_change_pct    DECIMAL(8, 4),
    deals_entered       INTEGER DEFAULT 0,
    deals_exited        INTEGER DEFAULT 0,
    value_entered       DECIMAL(15, 2) DEFAULT 0,
    value_exited        DECIMAL(15, 2) DEFAULT 0,
    avg_days_in_stage   DECIMAL(10, 2),
    median_deal_value   DECIMAL(15, 2),
    largest_deal_value  DECIMAL(15, 2),
    smallest_deal_value DECIMAL(15, 2),
    snapshot_taken_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(week_id, pipeline_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_snapshots_week ON weekly_stage_snapshots(week_id);
CREATE INDEX IF NOT EXISTS idx_stage_snapshots_category ON weekly_stage_snapshots(stage_category);

-- TABLE 3: DEAL WEEKLY SNAPSHOTS
-- Individual deal state at each snapshot
CREATE TABLE IF NOT EXISTS deal_weekly_snapshots (
    id                  SERIAL PRIMARY KEY,
    snapshot_run_id     INTEGER REFERENCES snapshot_runs(id) ON DELETE CASCADE,
    week_id             VARCHAR(10) NOT NULL,
    week_start_date     DATE NOT NULL,
    deal_id             VARCHAR(50) NOT NULL,
    deal_name           VARCHAR(255),
    end_customer_name   VARCHAR(255),
    pipeline_id         VARCHAR(50),
    pipeline_name       VARCHAR(100),
    stage_id            VARCHAR(50),
    stage_name          VARCHAR(100),
    stage_category      VARCHAR(20),
    amount              DECIMAL(15, 2),
    arr_usd             DECIMAL(15, 2),
    arr_local           DECIMAL(15, 2),
    currency            VARCHAR(10),
    owner_id            VARCHAR(50),
    owner_name          VARCHAR(100),
    created_date        DATE,
    close_date          DATE,
    contract_start_date DATE,
    last_modified_date  TIMESTAMP,
    days_in_current_stage INTEGER,
    stage_entered_date  DATE,
    prev_week_stage_id  VARCHAR(50),
    prev_week_value     DECIMAL(15, 2),
    stage_changed       BOOLEAN DEFAULT FALSE,
    value_changed       DECIMAL(15, 2),
    created_week        VARCHAR(10),
    weeks_since_created INTEGER,
    health_status       VARCHAR(20),
    health_reasons      TEXT[],
    UNIQUE(week_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_snapshots_week ON deal_weekly_snapshots(week_id);
CREATE INDEX IF NOT EXISTS idx_deal_snapshots_deal ON deal_weekly_snapshots(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_snapshots_stage ON deal_weekly_snapshots(stage_category);

-- TABLE 4: DEAL STAGE MOVEMENTS
-- Track all stage changes for deals
CREATE TABLE IF NOT EXISTS deal_stage_movements (
    id                  SERIAL PRIMARY KEY,
    snapshot_run_id     INTEGER REFERENCES snapshot_runs(id) ON DELETE CASCADE,
    week_id             VARCHAR(10) NOT NULL,
    deal_id             VARCHAR(50) NOT NULL,
    deal_name           VARCHAR(255),
    end_customer_name   VARCHAR(255),
    from_stage_id       VARCHAR(50),
    from_stage_name     VARCHAR(100),
    from_stage_category VARCHAR(20),
    to_stage_id         VARCHAR(50) NOT NULL,
    to_stage_name       VARCHAR(100),
    to_stage_category   VARCHAR(20),
    movement_type       VARCHAR(30) NOT NULL,
    is_forward          BOOLEAN,
    stages_skipped      INTEGER DEFAULT 0,
    deal_value          DECIMAL(15, 2),
    value_change        DECIMAL(15, 2),
    owner_id            VARCHAR(50),
    owner_name          VARCHAR(100),
    days_in_prev_stage  INTEGER,
    deal_age_weeks      INTEGER,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_week ON deal_stage_movements(week_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON deal_stage_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_deal ON deal_stage_movements(deal_id);

-- TABLE 5: HUBSPOT OWNERS CACHE
-- Cache owner information to avoid API calls
CREATE TABLE IF NOT EXISTS hubspot_owners (
    id                  VARCHAR(50) PRIMARY KEY,
    email               VARCHAR(255),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    full_name           VARCHAR(200),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- TABLE 6: HUBSPOT PIPELINES CACHE
-- Cache pipeline and stage information
CREATE TABLE IF NOT EXISTS hubspot_pipelines (
    id                  VARCHAR(50) PRIMARY KEY,
    label               VARCHAR(100),
    display_order       INTEGER,
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hubspot_stages (
    id                  VARCHAR(50) PRIMARY KEY,
    pipeline_id         VARCHAR(50) REFERENCES hubspot_pipelines(id) ON DELETE CASCADE,
    label               VARCHAR(100),
    display_order       INTEGER,
    category            VARCHAR(20),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- TABLE 7: SYNC LOGS
-- Track all sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
    id                  SERIAL PRIMARY KEY,
    sync_type           VARCHAR(50) NOT NULL,
    started_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMP,
    status              VARCHAR(20) NOT NULL DEFAULT 'running',
    records_processed   INTEGER DEFAULT 0,
    records_created     INTEGER DEFAULT 0,
    records_updated     INTEGER DEFAULT 0,
    error_message       TEXT,
    metadata            JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- TABLE 8: EXCHANGE RATES
-- Store monthly average exchange rates for currency conversion
CREATE TABLE IF NOT EXISTS exchange_rates (
    id                  SERIAL PRIMARY KEY,
    base_currency       VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_currency     VARCHAR(3) NOT NULL,
    rate                DECIMAL(12, 6) NOT NULL,  -- 1 base = X target (e.g., 1 USD = 0.92 EUR)
    inverse_rate        DECIMAL(12, 6) NOT NULL,  -- 1 target = X base (e.g., 1 EUR = 1.09 USD)
    year_month          VARCHAR(7) NOT NULL,       -- e.g., "2025-01"
    source              VARCHAR(50) DEFAULT 'frankfurter',
    fetched_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(base_currency, target_currency, year_month)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(target_currency, year_month);
