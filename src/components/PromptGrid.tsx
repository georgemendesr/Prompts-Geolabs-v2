import { useState, useMemo } from 'react';
import { Search, Loader2, Trash2, X, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategorySection } from './CategorySection';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { PromptEditDialog } from './PromptEditDialog';
import { useCategories, useAllPromptsByCategory, Prompt, useDeletePrompts } from '@/hooks/usePrompts';
import { useDebounce } from '@/hooks/useDebounce';

export function PromptGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: allPrompts = [], isLoading: loadingPrompts } = useAllPromptsByCategory();
  const deletePrompts = useDeletePrompts();

  // Filter prompts by search and group by category
  const promptsByCategory = useMemo(() => {
    const filtered = debouncedSearch
      ? allPrompts.filter(p => 
          p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.content.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : allPrompts;

    const grouped: Record<string, Prompt[]> = {};
    categories.forEach(cat => {
      grouped[cat.id] = [];
    });

    filtered.forEach(prompt => {
      if (prompt.category_id && grouped[prompt.category_id]) {
        grouped[prompt.category_id].push(prompt);
      }
    });

    return grouped;
  }, [allPrompts, categories, debouncedSearch]);

  const handleSelect = (promptId: string, selected: boolean) => {
    const newSelection = new Set(selectedIds);
    if (selected) {
      newSelection.add(promptId);
    } else {
      newSelection.delete(promptId);
    }
    setSelectedIds(newSelection);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmed = window.confirm(`Tem certeza que deseja deletar ${selectedIds.size} prompt(s)?`);
    if (!confirmed) return;

    deletePrompts.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    });
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const isLoading = loadingCategories || loadingPrompts;

  return (
    <div className="space-y-8">
      {/* Search Bar & Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50 focus:border-primary/50"
          />
        </div>
        <Button
          variant={selectionMode ? "default" : "outline"}
          size="icon"
          onClick={toggleSelectionMode}
          title={selectionMode ? "Cancelar seleção" : "Selecionar múltiplos"}
        >
          {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
        </Button>
      </div>

      {/* Selection Actions Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deletePrompts.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allPrompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum prompt disponível. Clique em "Novo Prompt" em qualquer categoria para começar!
          </p>
        </div>
      )}

      {/* Category Sections */}
      {!isLoading && categories.map(category => (
        <CategorySection
          key={category.id}
          category={category}
          prompts={promptsByCategory[category.id] || []}
          onView={setSelectedPrompt}
          onEdit={setEditingPrompt}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onSelect={handleSelect}
        />
      ))}

      {/* Prompt Detail Drawer */}
      <PromptDetailDrawer
        prompt={selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
      />

      {/* Prompt Edit Dialog */}
      <PromptEditDialog
        prompt={editingPrompt}
        onClose={() => setEditingPrompt(null)}
      />
    </div>
  );
}
