import { Music, FileText, Video, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/hooks/usePrompts';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (slug: string | null) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  musica: <Music className="h-3.5 w-3.5" />,
  texto: <FileText className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  imagem: <Image className="h-3.5 w-3.5" />,
};

const categoryColors: Record<string, string> = {
  musica: 'bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30',
  texto: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  video: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  imagem: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
};

const categoryColorsActive: Record<string, string> = {
  musica: 'bg-violet-500 text-white border-violet-500',
  texto: 'bg-blue-500 text-white border-blue-500',
  video: 'bg-red-500 text-white border-red-500',
  imagem: 'bg-green-500 text-white border-green-500',
};

export function CategoryPills({ categories, selectedCategory, onSelect }: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* All categories button */}
      <Badge
        variant="outline"
        className={cn(
          'cursor-pointer px-3 py-1.5 text-sm font-medium transition-all',
          !selectedCategory
            ? 'bg-primary text-primary-foreground border-primary'
            : 'hover:bg-muted'
        )}
        onClick={() => onSelect(null)}
      >
        Todos
      </Badge>

      {/* Category pills */}
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant="outline"
          className={cn(
            'cursor-pointer px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5',
            selectedCategory === category.slug
              ? categoryColorsActive[category.slug]
              : categoryColors[category.slug]
          )}
          onClick={() => onSelect(category.slug)}
        >
          {categoryIcons[category.slug]}
          {category.name}
        </Badge>
      ))}
    </div>
  );
}
