import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Prompt {
  id: string;
  user_id: string;
  category_id: string | null;
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
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function usePrompts(categorySlug?: string, subcategory?: string, search?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prompts', categorySlug, subcategory, search],
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

      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Prompt[];
    },
    enabled: !!user,
  });
}

export function useSubcategories(categorySlug?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subcategories', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select('subcategory');

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
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    },
    enabled: !!user,
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
