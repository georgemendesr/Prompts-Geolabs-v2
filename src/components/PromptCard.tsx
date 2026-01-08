import { useState } from 'react';
import { Copy, Star, Edit2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Prompt, useUpdatePromptUsage, useUpdatePromptRating } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptCardProps {
  prompt: Prompt;
  rank: number;
  onView?: (prompt: Prompt) => void;
  onEdit?: (prompt: Prompt) => void;
  isSelected?: boolean;
  onSelect?: (promptId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

export function PromptCard({ 
  prompt, 
  rank, 
  onView, 
  onEdit,
  isSelected = false,
  onSelect,
  selectionMode = false
}: PromptCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [copied, setCopied] = useState(false);
  const updateUsage = useUpdatePromptUsage();
  const updateRating = useUpdatePromptRating();

  const isTop5 = rank <= 5;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      updateUsage.mutate(prompt.id);
      setCopied(true);
      toast.success('Prompt copiado!', {
        description: `${prompt.title}`,
        duration: 2000,
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't copy if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-interactive]') ||
      target.closest('button') ||
      target.closest('[role="checkbox"]')
    ) {
      return;
    }
    handleCopy();
  };

  const handleRating = (e: React.MouseEvent, newRating: number) => {
    e.stopPropagation();
    updateRating.mutate({ promptId: prompt.id, rating: newRating });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(prompt);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(prompt.id, !isSelected);
  };

  const truncatedContent = prompt.content.length > 150
    ? prompt.content.slice(0, 150) + '...'
    : prompt.content;

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all duration-300 hover:scale-[1.02]',
        'border border-border/50 hover:border-primary/30',
        isTop5 && 'bg-primary/5 border-primary/20',
        isSelected && 'ring-2 ring-primary bg-primary/10',
        copied && 'bg-green-500/10 border-green-500/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredStar(0);
      }}
      onClick={handleCardClick}
    >
      {/* Top 5 Rank Badge */}
      {isTop5 && (
        <div className="absolute -top-2 -left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg">
          #{rank}
        </div>
      )}

      {/* Selection Checkbox */}
      {selectionMode && (
        <div 
          className="absolute top-3 left-3 z-10"
          data-interactive
          onClick={handleSelect}
        >
          <Checkbox 
            checked={isSelected}
            className="h-5 w-5 border-2"
          />
        </div>
      )}

      {/* Edit Button */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          'absolute top-3 right-3 z-10 transition-all duration-200',
          'hover:bg-muted',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleEdit}
        data-interactive
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      {/* Copied indicator */}
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-20">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-6 w-6" />
            <span className="font-medium">Copiado!</span>
          </div>
        </div>
      )}

      <CardContent className={cn("p-4", selectionMode && "pl-10")}>
        {/* Subcategory Badge */}
        <div className="flex items-center gap-2 mb-2">
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

        {/* Footer: Stars, Rating & Usage */}
        <div className="flex items-center justify-between">
          {/* Star Rating */}
          <div 
            className="flex items-center gap-0.5"
            data-interactive
            onMouseLeave={() => setHoveredStar(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => handleRating(e, star)}
                onMouseEnter={() => setHoveredStar(star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors',
                    star <= (hoveredStar || prompt.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Rating & Usage Stats */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {prompt.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {prompt.rating.toFixed(1)}
              </span>
            )}
            {prompt.usage_count > 0 && (
              <span>{prompt.usage_count} usos</span>
            )}
          </div>
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
