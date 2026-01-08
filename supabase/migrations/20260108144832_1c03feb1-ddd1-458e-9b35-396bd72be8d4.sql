-- Create subcategory_groups table (Selecionados, Forró, Reggae, etc.)
CREATE TABLE public.subcategory_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategory_groups ENABLE ROW LEVEL SECURITY;

-- Everyone can view subcategory groups
CREATE POLICY "Subcategory groups are viewable by authenticated users"
ON public.subcategory_groups
FOR SELECT
USING (true);

-- Add subcategory_group_id to prompts table
ALTER TABLE public.prompts 
ADD COLUMN subcategory_group_id UUID REFERENCES public.subcategory_groups(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_prompts_subcategory_group_id ON public.prompts(subcategory_group_id);
CREATE INDEX idx_subcategory_groups_category_id ON public.subcategory_groups(category_id);