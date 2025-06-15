-- Docker initialization script for website builder database
-- This script runs after the main database is created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For array indexes

-- Create additional indexes for performance
-- These will be created if they don't exist from Prisma

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_created 
ON projects(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_updated 
ON projects(generation_status, updated_at DESC);

-- Full text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_categories_search 
ON business_categories USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_templates_search 
ON service_templates USING gin(to_tsvector('english', name || ' ' || description));

-- Array indexes for better performance on array queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_website_structures_suitable 
ON website_structures USING gin(suitable_for);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hugo_themes_features 
ON hugo_themes USING gin(features);

-- Partial indexes for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_categories_active 
ON business_categories(display_name) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hugo_themes_active 
ON hugo_themes(popularity_score DESC) WHERE is_active = true;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, btree_gin';
    RAISE NOTICE 'Performance indexes created';
END $$;
