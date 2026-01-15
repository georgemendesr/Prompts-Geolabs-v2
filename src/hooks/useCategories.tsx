import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface SubcategoryGroup {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  sort_order: number | null;
  created_at: string;
}

export function useCategoriesManagement() {
  return useQuery({
    queryKey: ['categories-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { nullsFirst: false });
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useSubcategoryGroupsManagement(categoryId?: string) {
  return useQuery({
    queryKey: ['subcategory-groups-management', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('subcategory_groups')
        .select('*')
        .order('sort_order', { nullsFirst: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SubcategoryGroup[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; icon?: string; color?: string; sort_order?: number }) => {
      const { error } = await supabase
        .from('categories')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoria criada!');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: { name?: string; slug?: string; icon?: string; color?: string; sort_order?: number }
    }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoria atualizada!');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoria deletada!');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao deletar categoria: ' + error.message);
    },
  });
}

export function useCreateSubcategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; category_id: string; sort_order?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('subcategory_groups')
        .insert({ ...data, created_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo de subcategoria criado!');
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups'] });
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar grupo: ' + error.message);
    },
  });
}

export function useUpdateSubcategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: { name?: string; slug?: string; sort_order?: number }
    }) => {
      const { error } = await supabase
        .from('subcategory_groups')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo atualizado!');
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups'] });
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar grupo: ' + error.message);
    },
  });
}

export function useDeleteSubcategoryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subcategory_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo deletado!');
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups'] });
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups-management'] });
    },
    onError: (error) => {
      toast.error('Erro ao deletar grupo: ' + error.message);
    },
  });
}
