-- Add created_by column to subcategory_groups
ALTER TABLE public.subcategory_groups 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update existing records to have a default owner (null for now, will be system-created)
-- New records will require created_by

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can insert subcategory_groups" ON public.subcategory_groups;
DROP POLICY IF EXISTS "Users can update subcategory_groups" ON public.subcategory_groups;
DROP POLICY IF EXISTS "Authenticated users can delete subcategory_groups" ON public.subcategory_groups;

-- Create new owner-scoped policies
CREATE POLICY "Users can insert their own subcategory_groups" 
ON public.subcategory_groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own subcategory_groups" 
ON public.subcategory_groups 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own subcategory_groups" 
ON public.subcategory_groups 
FOR DELETE 
USING (auth.uid() = created_by);