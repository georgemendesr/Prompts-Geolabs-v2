import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SubcategoryDropdownProps {
  subcategories: { name: string; count: number }[];
  selectedSubcategory: string | null;
  onSelect: (subcategory: string | null) => void;
}

export function SubcategoryDropdown({ 
  subcategories, 
  selectedSubcategory, 
  onSelect 
}: SubcategoryDropdownProps) {
  return (
    <Select
      value={selectedSubcategory || 'all'}
      onValueChange={(value) => onSelect(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder="Todas as subcategorias" />
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-50">
        <SelectItem value="all">Todas as subcategorias</SelectItem>
        {subcategories.map((sub) => (
          <SelectItem key={sub.name} value={sub.name}>
            {sub.name} ({sub.count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
