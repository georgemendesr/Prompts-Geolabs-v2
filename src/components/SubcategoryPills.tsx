import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubcategoryPillsProps {
  subcategories: { name: string; count: number }[];
  selectedSubcategory: string | null;
  onSelect: (name: string | null) => void;
}

export function SubcategoryPills({ subcategories, selectedSubcategory, onSelect }: SubcategoryPillsProps) {
  if (subcategories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Clear subcategory button */}
      {selectedSubcategory && (
        <Badge
          variant="outline"
          className="cursor-pointer px-2.5 py-1 text-xs font-medium transition-all hover:bg-muted"
          onClick={() => onSelect(null)}
        >
          ✕ Limpar
        </Badge>
      )}

      {/* Subcategory pills */}
      {subcategories.map(({ name, count }) => (
        <Badge
          key={name}
          variant="outline"
          className={cn(
            'cursor-pointer px-2.5 py-1 text-xs font-medium transition-all',
            selectedSubcategory === name
              ? 'bg-secondary text-secondary-foreground border-secondary'
              : 'hover:bg-muted text-muted-foreground'
          )}
          onClick={() => onSelect(name)}
        >
          {name}
          <span className="ml-1.5 text-muted-foreground/70">({count})</span>
        </Badge>
      ))}
    </div>
  );
}
