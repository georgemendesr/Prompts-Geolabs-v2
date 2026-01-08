import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PromptCard } from './PromptCard';
import { CategoryPills } from './CategoryPills';
import { SubcategoryPills } from './SubcategoryPills';
import { PromptDetailDrawer } from './PromptDetailDrawer';
import { usePrompts, useCategories, useSubcategories, Prompt } from '@/hooks/usePrompts';
import { useDebounce } from '@/hooks/useDebounce';

export function PromptGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: subcategories = [] } = useSubcategories(selectedCategory || undefined);
  const { data: prompts = [], isLoading: loadingPrompts } = usePrompts(
    selectedCategory || undefined,
    selectedSubcategory || undefined,
    debouncedSearch || undefined
  );

  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategory(slug);
    setSelectedSubcategory(null); // Reset subcategory when category changes
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border/50 focus:border-primary/50"
        />
      </div>

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

      {/* Prompt Grid - Meritocratic Order with Top 5 Highlight */}
      {!loadingPrompts && prompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prompts.map((prompt, index) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              rank={index + 1}
              onView={setSelectedPrompt}
            />
          ))}
        </div>
      )}

      {/* Prompt Detail Drawer */}
      <PromptDetailDrawer
        prompt={selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
      />
    </div>
  );
}
