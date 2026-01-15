-- Criar tabela de projetos
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ligação: prompts associados a projetos
CREATE TABLE public.project_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, prompt_id)
);

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_prompts ENABLE ROW LEVEL SECURITY;

-- Policies para projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies para project_prompts (baseado no dono do projeto)
CREATE POLICY "Users can view project_prompts of their projects" 
ON public.project_prompts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_prompts.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add prompts to their projects" 
ON public.project_prompts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_prompts.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove prompts from their projects" 
ON public.project_prompts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_prompts.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at nos projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Permitir que usuários autenticados insiram/atualizem subcategory_groups
CREATE POLICY "Users can insert subcategory_groups" 
ON public.subcategory_groups 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update subcategory_groups" 
ON public.subcategory_groups 
FOR UPDATE 
USING (true);