import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreatePrompt, Category, SubcategoryGroup } from '@/hooks/usePrompts';

interface PromptCreateDialogProps {
  open: boolean;
  onClose: () => void;
  category: Category;
  subcategoryGroup?: SubcategoryGroup | null;
}

export function PromptCreateDialog({ open, onClose, category, subcategoryGroup }: PromptCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [tags, setTags] = useState('');
  
  const createPrompt = useCreatePrompt();

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    createPrompt.mutate({
      title,
      content,
      category_id: category.id,
      subcategory_group_id: subcategoryGroup?.id,
      subcategory: subcategory || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    }, {
      onSuccess: () => {
        setTitle('');
        setContent('');
        setSubcategory('');
        setTags('');
        onClose();
      }
    });
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setSubcategory('');
    setTags('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Novo Prompt - {category.name}
            {subcategoryGroup && ` / ${subcategoryGroup.name}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-title">Título</Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prompt"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-content">Conteúdo</Label>
            <Textarea
              id="create-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo do prompt"
              className="min-h-[200px] font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-subcategory">Subcategoria</Label>
            <Input
              id="create-subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Forró Master, Reggae Premium, etc."
            />
          </div>
          
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
            disabled={createPrompt.isPending || !title.trim() || !content.trim()}
          >
            {createPrompt.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
