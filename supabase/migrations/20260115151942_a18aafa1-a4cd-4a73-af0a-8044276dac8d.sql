-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete subcategory_groups
CREATE POLICY "Authenticated users can delete subcategory_groups"
ON public.subcategory_groups FOR DELETE
TO authenticated
USING (true);