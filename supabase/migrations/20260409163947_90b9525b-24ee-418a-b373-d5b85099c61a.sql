
-- Add source visibility and alternative source fields to news_sources
ALTER TABLE public.news_sources
  ADD COLUMN IF NOT EXISTS hide_original_source boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alt_source_name text,
  ADD COLUMN IF NOT EXISTS alt_source_url text,
  ADD COLUMN IF NOT EXISTS assigned_category text;

-- Add video_url to articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS video_url text;
