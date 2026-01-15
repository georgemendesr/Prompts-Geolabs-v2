import { useState } from 'react';
import { Search, Loader2, Check, Music, FileText, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  usePrompts, 
  useCategories, 
  Prompt, 
  Category 
} from '@/hooks/usePrompts';
import { useAddMultiplePromptsToProject, useProjectPrompts } from '@/hooks/useProjects';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface AddPromptsToProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const categoryIcons: Record<string, any> = {
  'musica': Music,
  'texto': FileText,
  'imagem': Image,
  'video': Video,
};

export function AddPromptsToProjectDialog({ 
  open, 
  onClose, 
  projectId 
}: AddPromptsToProjectDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: categories = [] } = useCategories();
  const { data: prompts = [], isLoading } = usePrompts(
    selectedCategory || undefined,
    undefined,
    undefined,
    debouncedSearch || undefined
  );
  const { data: existingPrompts = [] } = useProjectPrompts(projectId);
  const addPrompts = useAddMultiplePromptsToProject();

  // Get IDs of prompts already in project
  const existingPromptIds = new Set(existingPrompts.map(ep => ep.prompt_id));

  // Filter out prompts already in project
  const availablePrompts = prompts.filter(p => !existingPromptIds.has(p.id));

  const togglePrompt = (promptId: string) => {
    const newSelection = new Set(selectedPromptIds);
    if (newSelection.has(promptId)) {
      newSelection.delete(promptId);
    } else {
      newSelection.add(promptId);
    }
    setSelectedPromptIds(newSelection);
  };

  const handleAdd = () => {
    if (selectedPromptIds.size === 0) return;

    addPrompts.mutate(
      { projectId, promptIds: Array.from(selectedPromptIds) },
      {
        onSuccess: () => {
          setSelectedPromptIds(new Set());
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedPromptIds(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Prompts ao Projeto</DialogTitle>
          <DialogDescription>
            Selecione prompts de qualquer categoria para adicionar ao projeto
          </DialogDescription>
        </DialogHeader>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((cat) => {
            const IconComponent = categoryIcons[cat.slug] || FileText;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.slug ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.slug)}
                className="gap-1"
              >
                <IconComponent className="h-3.5 w-3.5" />
                {cat.name}
              </Button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Count */}
        {selectedPromptIds.size > 0 && (
          <Badge variant="secondary">
            {selectedPromptIds.size} selecionado(s)
          </Badge>
        )}

        {/* Prompts List */}
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : availablePrompts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {selectedCategory ? 'Nenhum prompt disponível nesta categoria' : 'Selecione uma categoria'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {availablePrompts.map((prompt) => (
                <PromptSelectItem
                  key={prompt.id}
                  prompt={prompt}
                  isSelected={selectedPromptIds.has(prompt.id)}
                  onToggle={() => togglePrompt(prompt.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={selectedPromptIds.size === 0 || addPrompts.isPending}
          >
            {addPrompts.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Adicionar {selectedPromptIds.size > 0 && `(${selectedPromptIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromptSelectItem({ 
  prompt, 
  isSelected, 
  onToggle 
}: { 
  prompt: Prompt; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  const IconComponent = categoryIcons[prompt.categories?.slug || ''] || FileText;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors',
        isSelected 
          ? 'bg-primary/10 border border-primary/30' 
          : 'hover:bg-muted border border-transparent'
      )}
      onClick={onToggle}
    >
      <div className={cn(
        'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center',
        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
      )}>
        {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{prompt.title}</span>
        </div>
        {prompt.subcategory_groups?.name && (
          <span className="text-xs text-muted-foreground">
            {prompt.subcategory_groups.name}
            {prompt.subcategory && ` › ${prompt.subcategory}`}
          </span>
        )}
      </div>
    </div>
  );
}
