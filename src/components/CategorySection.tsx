import { useState } from 'react';
import { Plus, Image, Music, FileText, Video, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptCard } from './PromptCard';
import { PromptCreateDialog } from './PromptCreateDialog';
import { Category, Prompt } from '@/hooks/usePrompts';

interface CategorySectionProps {
  category: Category;
  prompts: Prompt[];
  onView: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelect: (promptId: string, selected: boolean) => void;
}

const categoryIcons: Record<string, typeof Image> = {
  imagem: Image,
  musica: Music,
  texto: FileText,
  video: Video,
};

export function CategorySection({ 
  category, 
  prompts, 
  onView, 
  onEdit,
  selectionMode,
  selectedIds,
  onSelect 
}: CategorySectionProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const IconComponent = categoryIcons[category.slug] || Folder;

  // Calculate ranks within this category
  const sortedPrompts = [...prompts].sort((a, b) => {
    const scoreA = (a.rating || 0) * 10 + (a.usage_count || 0) + (a.legacy_score || 0);
    const scoreB = (b.rating || 0) * 10 + (b.usage_count || 0) + (b.legacy_score || 0);
    return scoreB - scoreA;
  });

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: category.color ? `${category.color}20` : 'hsl(var(--muted))' }}
          >
            <IconComponent 
              className="h-5 w-5" 
              style={{ color: category.color || 'hsl(var(--foreground))' }}
            />
          </div>
          <h2 className="text-xl font-semibold">{category.name}</h2>
          <span className="text-sm text-muted-foreground">
            ({prompts.length} prompts)
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Prompt
        </Button>
      </div>

      {/* Prompts Grid */}
      {prompts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedPrompts.map((prompt, index) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              rank={index + 1}
              onView={onView}
              onEdit={onEdit}
              isSelected={selectedIds.has(prompt.id)}
              onSelect={onSelect}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum prompt nesta categoria. Clique em "Novo Prompt" para adicionar!
        </div>
      )}

      {/* Create Dialog */}
      <PromptCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        category={category}
      />
    </section>
  );
}
