-- Add sort_order to categories if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Set Música as first (lowest sort_order)
UPDATE public.categories SET sort_order = 1 WHERE slug = 'musica';
UPDATE public.categories SET sort_order = 2 WHERE slug = 'texto';
UPDATE public.categories SET sort_order = 3 WHERE slug = 'imagem';
UPDATE public.categories SET sort_order = 4 WHERE slug = 'video';