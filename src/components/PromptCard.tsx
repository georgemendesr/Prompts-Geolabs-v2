import { useState } from 'react';
import { Copy, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Prompt, useUpdatePromptUsage, useUpdatePromptRating } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptCardProps {
  prompt: Prompt;
  rank: number;
  onView?: (prompt: Prompt) => void;
}

const categoryBadgeClass: Record<string, string> = {
  musica: 'badge-musica',
  texto: 'badge-texto',
  video: 'badge-video',
  imagem: 'badge-imagem',
};

export function PromptCard({ prompt, rank, onView }: PromptCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const updateUsage = useUpdatePromptUsage();
  const updateRating = useUpdatePromptRating();

  const isTop5 = rank <= 5;
  const categorySlug = prompt.categories?.slug || 'texto';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(prompt.content);
      
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      updateUsage.mutate(prompt.id);
      toast.success('Prompt copiado!', {
        description: `${prompt.title}`,
        duration: 2000,
      });
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleRating = (e: React.MouseEvent, newRating: number) => {
    e.stopPropagation();
    updateRating.mutate({ promptId: prompt.id, rating: newRating });
  };

  const truncatedContent = prompt.content.length > 150
    ? prompt.content.slice(0, 150) + '...'
    : prompt.content;

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all duration-300 hover:scale-[1.02]',
        'border border-border/50 hover:border-primary/30',
        isTop5 && 'top-highlight animate-pulse-glow border-top-highlight/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView?.(prompt)}
    >
      {/* Top 5 Rank Badge */}
      {isTop5 && (
        <div className="absolute -top-2 -left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-top-highlight text-background font-bold text-sm shadow-lg">
          #{rank}
        </div>
      )}

      {/* Copy Button */}
      <Button
        size="icon"
        variant="secondary"
        className={cn(
          'absolute top-3 right-3 z-10 transition-all duration-200',
          'bg-primary hover:bg-primary/80 text-primary-foreground',
          'shadow-lg shadow-primary/20',
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        )}
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>

      <CardContent className="p-4">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              categoryBadgeClass[categorySlug]
            )}
          >
            {prompt.categories?.name || 'Sem categoria'}
          </Badge>
          {prompt.subcategory && (
            <Badge variant="secondary" className="text-xs">
              {prompt.subcategory}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
          {prompt.title}
        </h3>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground font-mono line-clamp-3 mb-3">
          {truncatedContent}
        </p>

        {/* Footer: Stars & Tags */}
        <div className="flex items-center justify-between">
          {/* Star Rating */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => handleRating(e, star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors',
                    star <= prompt.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Usage Count */}
          <span className="text-xs text-muted-foreground">
            {prompt.usage_count > 0 && `${prompt.usage_count} usos`}
          </span>
        </div>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
