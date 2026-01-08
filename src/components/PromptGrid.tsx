import { useState } from 'react';
import { Search, Loader2, Trash2, X, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PromptCard } from './PromptCard';
import { CategoryPills } from './CategoryPills';
import { SubcategoryPills } from './SubcategoryPills';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { PromptEditDialog } from './PromptEditDialog';
import { usePrompts, useCategories, useSubcategories, Prompt, useDeletePrompts } from '@/hooks/usePrompts';
import { useDebounce } from '@/hooks/useDebounce';

export function PromptGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: subcategories = [] } = useSubcategories(selectedCategory || undefined);
  const { data: prompts = [], isLoading: loadingPrompts } = usePrompts(
    selectedCategory || undefined,
    selectedSubcategory || undefined,
    debouncedSearch || undefined
  );
  const deletePrompts = useDeletePrompts();

  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategory(slug);
    setSelectedSubcategory(null);
  };

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

  return (
    <div className="space-y-6">
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

      {/* Category Pills */}
      {!loadingCategories && (
        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Subcategory Pills */}
      <SubcategoryPills
        subcategories={subcategories}
        selectedSubcategory={selectedSubcategory}
        onSelect={setSelectedSubcategory}
      />

      {/* Loading State */}
      {loadingPrompts && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loadingPrompts && prompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? 'Nenhum prompt encontrado para sua busca.'
              : 'Nenhum prompt disponível. Importe seus prompts para começar!'}
          </p>
        </div>
      )}

      {/* Prompt Grid */}
      {!loadingPrompts && prompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prompts.map((prompt, index) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              rank={index + 1}
              onView={setSelectedPrompt}
              onEdit={setEditingPrompt}
              isSelected={selectedIds.has(prompt.id)}
              onSelect={handleSelect}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      )}

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
