import { Music, FileText, Video, Image } from 'lucide-react';
import { Category } from '@/hooks/usePrompts';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (slug: string | null) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  musica: <Music className="h-4 w-4" />,
  texto: <FileText className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  imagem: <Image className="h-4 w-4" />,
};

export function CategoryPills({ categories, selectedCategory, onSelect }: CategoryPillsProps) {
  return (
    <div className="border-b border-border">
      <div className="flex overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium uppercase tracking-wide transition-all whitespace-nowrap',
              'border-b-2 -mb-px',
              selectedCategory === category.slug
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            )}
            onClick={() => onSelect(selectedCategory === category.slug ? null : category.slug)}
          >
            {categoryIcons[category.slug]}
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
