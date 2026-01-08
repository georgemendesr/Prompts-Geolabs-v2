import { SubcategoryGroup } from '@/hooks/usePrompts';
import { cn } from '@/lib/utils';

interface SubcategoryGroupPillsProps {
  groups: SubcategoryGroup[];
  selectedGroup: SubcategoryGroup | null;
  onSelect: (group: SubcategoryGroup | null) => void;
}

export function SubcategoryGroupPills({ groups, selectedGroup, onSelect }: SubcategoryGroupPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelect(selectedGroup?.id === group.id ? null : group)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            "border hover:shadow-md",
            selectedGroup?.id === group.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/50"
          )}
        >
          {group.name}
        </button>
      ))}
    </div>
  );
}
