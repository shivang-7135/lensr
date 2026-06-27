-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic cache table: stores query embeddings + full pipeline results
CREATE TABLE public.search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    query_normalized TEXT NOT NULL,  -- lowercase, trimmed
    embedding vector(1024),          -- Titan Embeddings v2 = 1024 dims
    intent TEXT NOT NULL,
    structured JSONB NOT NULL,       -- full structured result payload
    markdown TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Index for fast vector similarity search (IVFFlat for good recall at scale)
CREATE INDEX idx_search_cache_embedding ON public.search_cache
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for TTL cleanup
CREATE INDEX idx_search_cache_expires ON public.search_cache (expires_at);

-- Unique index for exact text match (fast path + upsert support)
CREATE UNIQUE INDEX idx_search_cache_normalized ON public.search_cache (query_normalized);

-- Function: find semantically similar cached results
CREATE OR REPLACE FUNCTION public.match_search_cache(
    query_embedding vector(1024),
    match_threshold FLOAT DEFAULT 0.88,
    match_count INT DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    query TEXT,
    intent TEXT,
    structured JSONB,
    markdown TEXT,
    sources JSONB,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        sc.id,
        sc.query,
        sc.intent,
        sc.structured,
        sc.markdown,
        sc.sources,
        1 - (sc.embedding <=> query_embedding) AS similarity
    FROM public.search_cache sc
    WHERE sc.expires_at > now()
        AND 1 - (sc.embedding <=> query_embedding) > match_threshold
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- RLS: cache is managed by the backend (service role), not by end users
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON public.search_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read (for potential client-side cache checks)
CREATE POLICY "authenticated_read" ON public.search_cache
    FOR SELECT TO authenticated USING (true);

-- Cleanup function: delete expired entries (call via pg_cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.search_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
