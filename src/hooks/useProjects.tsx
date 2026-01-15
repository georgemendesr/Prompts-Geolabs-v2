import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPrompt {
  id: string;
  project_id: string;
  prompt_id: string;
  added_at: string;
}

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useProject(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!user && !!projectId,
  });
}

export function useProjectPrompts(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-prompts', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_prompts')
        .select(`
          *,
          prompts (
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
          )
        `)
        .eq('project_id', projectId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      toast.success('Projeto criado!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      toast.error('Erro ao criar projeto');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, updates }: {
      projectId: string;
      updates: { name?: string; description?: string };
    }) => {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projeto atualizado!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar projeto');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projeto deletado!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      toast.error('Erro ao deletar projeto');
    },
  });
}

export function useAddPromptToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, promptId }: { projectId: string; promptId: string }) => {
      const { error } = await supabase
        .from('project_prompts')
        .insert({
          project_id: projectId,
          prompt_id: promptId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prompt adicionado ao projeto!');
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Prompt já está neste projeto');
      } else {
        toast.error('Erro ao adicionar prompt');
      }
    },
  });
}

export function useRemovePromptFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, promptId }: { projectId: string; promptId: string }) => {
      const { error } = await supabase
        .from('project_prompts')
        .delete()
        .eq('project_id', projectId)
        .eq('prompt_id', promptId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prompt removido do projeto!');
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
    },
    onError: () => {
      toast.error('Erro ao remover prompt');
    },
  });
}

export function useAddMultiplePromptsToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, promptIds }: { projectId: string; promptIds: string[] }) => {
      const inserts = promptIds.map(prompt_id => ({
        project_id: projectId,
        prompt_id,
      }));

      const { error } = await supabase
        .from('project_prompts')
        .upsert(inserts, { onConflict: 'project_id,prompt_id' });

      if (error) throw error;
    },
    onSuccess: (_, { promptIds }) => {
      toast.success(`${promptIds.length} prompt(s) adicionado(s) ao projeto!`);
      queryClient.invalidateQueries({ queryKey: ['project-prompts'] });
    },
    onError: () => {
      toast.error('Erro ao adicionar prompts');
    },
  });
}
