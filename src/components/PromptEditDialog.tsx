import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Prompt, useUpdatePrompt } from '@/hooks/usePrompts';

interface PromptEditDialogProps {
  prompt: Prompt | null;
  onClose: () => void;
}

export function PromptEditDialog({ prompt, onClose }: PromptEditDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [tags, setTags] = useState('');
  
  const updatePrompt = useUpdatePrompt();

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setSubcategory(prompt.subcategory || '');
      setTags(prompt.tags?.join(', ') || '');
    }
  }, [prompt]);

  const handleSave = () => {
    if (!prompt) return;

    updatePrompt.mutate({
      promptId: prompt.id,
      updates: {
        title,
        content,
        subcategory: subcategory || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!prompt} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prompt"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo do prompt"
              className="min-h-[200px] font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategoria</Label>
            <Input
              id="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Ex: Reggae, Pop, etc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updatePrompt.isPending}>
            {updatePrompt.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
