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
  onSave: (data: { name: string; slug: string; category_id: string }) => void;
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

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSlug(group.slug);
    } else {
      setName('');
      setSlug('');
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar Subcategoria' : 'Nova Subcategoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Rock, Pop, Jazz..."
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
