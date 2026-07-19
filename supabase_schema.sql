-- Supabase Schema for Effiflo Dev Profile Unifier

-- 1. Raw Profiles Table
-- Stores the exact untouched JSON response from each platform.
CREATE TABLE raw_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL, -- e.g., 'github', 'stackoverflow', 'devto', 'hackernews'
    handle VARCHAR(255) NOT NULL,
    raw_data JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, handle)
);

-- 2. Canonical Entities Table
-- The unified real-world person.
CREATE TABLE canonical_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_name VARCHAR(255),
    llm_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Entity Links Table
-- Maps raw profiles to a canonical entity with a confidence score.
CREATE TABLE entity_links (
    canonical_id UUID REFERENCES canonical_entities(id) ON DELETE CASCADE,
    raw_profile_id UUID REFERENCES raw_profiles(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
    match_reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'pending_review', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (canonical_id, raw_profile_id)
);

-- Indexes for performance
CREATE INDEX idx_raw_profiles_platform_handle ON raw_profiles(platform, handle);
CREATE INDEX idx_entity_links_status ON entity_links(status);

-- 4. Search Cache Table (Phase 1a)
-- Stores the ~300 raw candidate choices for a specific name/metadata query.
CREATE TABLE search_cache (
    query_hash VARCHAR(255) PRIMARY KEY,
    candidates_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
