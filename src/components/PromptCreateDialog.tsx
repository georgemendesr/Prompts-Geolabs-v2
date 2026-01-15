import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePrompt, useCategories, useSubcategoryGroups, useSubcategories, Category, SubcategoryGroup } from '@/hooks/usePrompts';

interface PromptCreateDialogProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  subcategoryGroup?: SubcategoryGroup | null;
}

export function PromptCreateDialog({ open, onClose, category: initialCategory, subcategoryGroup: initialSubcategoryGroup }: PromptCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryGroupId, setSelectedSubcategoryGroupId] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [tags, setTags] = useState('');
  
  const createPrompt = useCreatePrompt();
  const { data: categories = [] } = useCategories();
  const { data: subcategoryGroups = [] } = useSubcategoryGroups(selectedCategoryId || undefined);
  const { data: subcategories = [] } = useSubcategories(selectedSubcategoryGroupId || undefined);

  // Set initial values when dialog opens
  useEffect(() => {
    if (open) {
      if (initialCategory) {
        setSelectedCategoryId(initialCategory.id);
      }
      if (initialSubcategoryGroup) {
        setSelectedSubcategoryGroupId(initialSubcategoryGroup.id);
      }
    }
  }, [open, initialCategory, initialSubcategoryGroup]);

  // Reset subcategory group when category changes
  useEffect(() => {
    if (selectedCategoryId !== initialCategory?.id) {
      setSelectedSubcategoryGroupId('');
      setSelectedSubcategory('');
    }
  }, [selectedCategoryId, initialCategory?.id]);

  // Reset subcategory when subcategory group changes
  useEffect(() => {
    if (selectedSubcategoryGroupId !== initialSubcategoryGroup?.id) {
      setSelectedSubcategory('');
    }
  }, [selectedSubcategoryGroupId, initialSubcategoryGroup?.id]);

  const handleSave = () => {
    if (!title.trim() || !content.trim() || !selectedCategoryId) return;

    createPrompt.mutate({
      title,
      content,
      category_id: selectedCategoryId,
      subcategory_group_id: selectedSubcategoryGroupId || undefined,
      subcategory: selectedSubcategory || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    }, {
      onSuccess: () => {
        resetForm();
        onClose();
      }
    });
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedCategoryId('');
    setSelectedSubcategoryGroupId('');
    setSelectedSubcategory('');
    setTags('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-title">Título</Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prompt"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-content">Conteúdo</Label>
            <Textarea
              id="create-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo do prompt"
              className="min-h-[150px] font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select 
                value={selectedSubcategoryGroupId} 
                onValueChange={setSelectedSubcategoryGroupId}
                disabled={!selectedCategoryId || subcategoryGroups.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subcategoryGroups.length === 0 ? "Nenhuma" : "Selecione..."} />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-subcategoria</Label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.name} value={sub.name}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="create-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="create-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={createPrompt.isPending || !title.trim() || !content.trim() || !selectedCategoryId}
          >
            {createPrompt.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
