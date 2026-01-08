import { Copy, Star, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Prompt, useUpdatePromptUsage, useUpdatePromptRating } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptDetailDrawerProps {
  prompt: Prompt | null;
  onClose: () => void;
}

const categoryBadgeClass: Record<string, string> = {
  musica: 'badge-musica',
  texto: 'badge-texto',
  video: 'badge-video',
  imagem: 'badge-imagem',
};

export function PromptDetailDrawer({ prompt, onClose }: PromptDetailDrawerProps) {
  const updateUsage = useUpdatePromptUsage();
  const updateRating = useUpdatePromptRating();

  if (!prompt) return null;

  const categorySlug = prompt.categories?.slug || 'texto';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      updateUsage.mutate(prompt.id);
      toast.success('Prompt copiado!', {
        description: prompt.title,
        duration: 2000,
      });
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleRating = (newRating: number) => {
    updateRating.mutate({ promptId: prompt.id, rating: newRating });
  };

  return (
    <Sheet open={!!prompt} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Category & Subcategory */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', categoryBadgeClass[categorySlug])}
            >
              {prompt.categories?.name || 'Sem categoria'}
            </Badge>
            {prompt.subcategory && (
              <Badge variant="secondary" className="text-xs">
                {prompt.subcategory}
              </Badge>
            )}
          </div>

          <SheetTitle className="text-left text-xl font-bold">
            {prompt.title}
          </SheetTitle>

          {/* Star Rating */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-5 w-5 transition-colors',
                    star <= prompt.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {prompt.usage_count} usos
            </span>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {prompt.content}
            </p>
          </div>

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Criado em: {new Date(prompt.created_at).toLocaleDateString('pt-BR')}</p>
            {prompt.last_used_at && (
              <p>Último uso: {new Date(prompt.last_used_at).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </div>

        {/* Copy Button */}
        <div className="mt-6">
          <Button onClick={handleCopy} className="w-full" size="lg">
            <Copy className="mr-2 h-4 w-4" />
            Copiar Prompt
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
