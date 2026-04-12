-- Add images array and cleaned_content for better media handling
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

-- Add index for media queries
CREATE INDEX IF NOT EXISTS idx_articles_has_video ON public.articles ((video_url IS NOT NULL)) WHERE video_url IS NOT NULL;
