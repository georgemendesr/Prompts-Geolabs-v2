import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Music, FileText, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PromptCard } from '@/components/PromptCard';
import { PromptDetailDrawer } from '@/components/PromptDetailDrawer';
import { AddPromptsToProjectDialog } from './AddPromptsToProjectDialog';
import { 
  useProject, 
  useProjectPrompts, 
  useRemovePromptFromProject 
} from '@/hooks/useProjects';
import { Prompt } from '@/hooks/usePrompts';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

const categoryIcons: Record<string, any> = {
  'musica': Music,
  'texto': FileText,
  'imagem': Image,
  'video': Video,
};

const categoryColors: Record<string, string> = {
  'musica': 'bg-violet-500',
  'texto': 'bg-emerald-500',
  'imagem': 'bg-amber-500',
  'video': 'bg-rose-500',
};

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: projectPrompts = [], isLoading: loadingPrompts } = useProjectPrompts(projectId);
  const removePrompt = useRemovePromptFromProject();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  // Group prompts by category
  const promptsByCategory = projectPrompts.reduce((acc, pp) => {
    const categorySlug = pp.prompts?.categories?.slug || 'sem-categoria';
    if (!acc[categorySlug]) {
      acc[categorySlug] = {
        name: pp.prompts?.categories?.name || 'Sem Categoria',
        slug: categorySlug,
        prompts: [],
      };
    }
    acc[categorySlug].prompts.push(pp.prompts as Prompt);
    return acc;
  }, {} as Record<string, { name: string; slug: string; prompts: Prompt[] }>);

  const handleRemovePrompt = (promptId: string) => {
    if (confirm('Remover este prompt do projeto?')) {
      removePrompt.mutate({ projectId, promptId });
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button onClick={onBack} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Prompts
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        {Object.values(promptsByCategory).map((cat) => {
          const IconComponent = categoryIcons[cat.slug] || FileText;
          const bgColor = categoryColors[cat.slug] || 'bg-gray-500';
          return (
            <Badge key={cat.slug} variant="secondary" className="gap-1">
              <span className={`w-2 h-2 rounded-full ${bgColor}`} />
              {cat.name}: {cat.prompts.length}
            </Badge>
          );
        })}
      </div>

      {/* Loading */}
      {loadingPrompts && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loadingPrompts && projectPrompts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum prompt no projeto</h3>
            <p className="text-muted-foreground mb-4">
              Adicione prompts de música, texto, imagem ou vídeo
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Prompts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prompts by Category */}
      {!loadingPrompts && Object.values(promptsByCategory).map((category) => {
        const IconComponent = categoryIcons[category.slug] || FileText;
        const bgColor = categoryColors[category.slug] || 'bg-gray-500';
        
        return (
          <div key={category.slug} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${bgColor}`}>
                <IconComponent className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold">{category.name}</h2>
              <Badge variant="outline">{category.prompts.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.prompts.map((prompt, index) => (
                <div key={prompt.id} className="relative group">
                  <PromptCard
                    prompt={prompt}
                    rank={index + 1}
                    onView={setSelectedPrompt}
                    onEdit={() => {}}
                    isSelected={false}
                    onSelect={() => {}}
                    selectionMode={false}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePrompt(prompt.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Prompt Detail Drawer */}
      <PromptDetailDrawer
        prompt={selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
      />

      {/* Add Prompts Dialog */}
      <AddPromptsToProjectDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}
