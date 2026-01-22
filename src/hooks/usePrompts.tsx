import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Prompt {
  id: string;
  user_id: string;
  category_id: string | null;
  subcategory_group_id: string | null;
  title: string;
  content: string;
  subcategory: string | null;
  rating: number;
  usage_count: number;
  legacy_score: number;
  last_used_at: string | null;
  tags: string[];
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  } | null;
  subcategory_groups?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export interface SubcategoryGroup {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  sort_order: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useSubcategoryGroups(categoryId?: string) {
  return useQuery({
    queryKey: ['subcategory-groups', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('subcategory_groups')
        .select('*')
        .order('sort_order');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SubcategoryGroup[];
    },
    enabled: !!categoryId,
  });
}

export function usePrompts(
  categorySlug?: string, 
  subcategoryGroupId?: string, 
  subcategory?: string, 
  search?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prompts', categorySlug, subcategoryGroupId, subcategory, search],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            icon,
            color
          ),
          subcategory_groups (
            id,
            name,
            slug
          )
        `)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('usage_count', { ascending: false })
        .order('legacy_score', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: true });

      if (categorySlug) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();
        
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      if (subcategoryGroupId) {
        query = query.eq('subcategory_group_id', subcategoryGroupId);
      }

      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }

      if (search && search.length <= 100) {
        // Sanitize search input to prevent PostgREST filter injection
        // Remove special characters that could manipulate query logic: % , . ( )
        const sanitized = search.replace(/[%,\.\(\)]/g, '').trim();
        
        if (sanitized.length > 0) {
          query = query.or(`title.ilike.%${sanitized}%,content.ilike.%${sanitized}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Prompt[];
    },
    enabled: !!user,
  });
}

export function useSubcategories(subcategoryGroupId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subcategories', subcategoryGroupId],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select('subcategory');

      if (subcategoryGroupId) {
        query = query.eq('subcategory_group_id', subcategoryGroupId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const subcategoryCount: Record<string, number> = {};
      data?.forEach((item) => {
        if (item.subcategory) {
          subcategoryCount[item.subcategory] = (subcategoryCount[item.subcategory] || 0) + 1;
        }
      });

      return Object.entries(subcategoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
    },
    enabled: !!user && !!subcategoryGroupId,
  });
}

export function useUpdatePromptUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promptId: string) => {
      const { data: prompt } = await supabase
        .from('prompts')
        .select('usage_count')
        .eq('id', promptId)
        .single();

      if (prompt) {
        await supabase
          .from('prompts')
          .update({
            usage_count: (prompt.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', promptId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

export function useUpdatePromptRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptId, rating }: { promptId: string; rating: number }) => {
      const { error } = await supabase
        .from('prompts')
        .update({ rating })
        .eq('id', promptId);

      if (error) throw error;
    },
    onMutate: async ({ promptId, rating }) => {
      await queryClient.cancelQueries({ queryKey: ['prompts'] });
      
      queryClient.setQueryData(['prompts'], (old: Prompt[] | undefined) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === promptId ? { ...p, rating } : p
        );
      });
    },
    onSuccess: () => {
      toast.success('Rating atualizado!');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar rating');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptId, updates }: { 
      promptId: string; 
      updates: {
        title?: string;
        content?: string;
        subcategory?: string | null;
        subcategory_group_id?: string | null;
        tags?: string[];
      }
    }) => {
      const { error } = await supabase
        .from('prompts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prompt atualizado!');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar prompt');
    },
  });
}

export function useDeletePrompts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promptIds: string[]) => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .in('id', promptIds);

      if (error) throw error;
    },
    onSuccess: (_, promptIds) => {
      toast.success(`${promptIds.length} prompt(s) deletado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: () => {
      toast.error('Erro ao deletar prompts');
    },
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      category_id: string;
      subcategory_group_id?: string;
      subcategory?: string;
      tags?: string[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('prompts')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prompt criado!');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
    onError: () => {
      toast.error('Erro ao criar prompt');
    },
  });
}
