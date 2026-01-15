import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubcategoryGroup } from '@/hooks/useCategories';

interface SubcategoryGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: SubcategoryGroup | null;
  categoryId: string;
  onSave: (data: { name: string; slug: string; category_id: string; sort_order?: number }) => void;
  isLoading?: boolean;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export function SubcategoryGroupDialog({ open, onOpenChange, group, categoryId, onSave, isLoading }: SubcategoryGroupDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState<number | ''>('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSlug(group.slug);
      setSortOrder(group.sort_order ?? '');
    } else {
      setName('');
      setSlug('');
      setSortOrder('');
    }
  }, [group, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!group) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      slug,
      category_id: categoryId,
      sort_order: sortOrder !== '' ? Number(sortOrder) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar Grupo' : 'Novo Grupo de Subcategoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Estilos Musicais"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ex: estilos-musicais"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Ordem</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ex: 1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
