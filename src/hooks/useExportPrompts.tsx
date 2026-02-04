import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useExportPrompts() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Fetch all prompts with category and subcategory group info
      const { data: prompts, error } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          content,
          subcategory,
          rating,
          usage_count,
          tags,
          created_at,
          updated_at,
          categories (name),
          subcategory_groups (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!prompts || prompts.length === 0) {
        toast.error('Nenhum prompt para exportar');
        return;
      }

      // Convert to CSV format
      const headers = [
        'ID',
        'Título',
        'Conteúdo',
        'Categoria',
        'Grupo',
        'Subcategoria',
        'Rating',
        'Uso',
        'Tags',
        'Criado em',
        'Atualizado em'
      ];

      const csvRows = [headers.join(',')];

      for (const prompt of prompts) {
        const row = [
          prompt.id,
          `"${(prompt.title || '').replace(/"/g, '""')}"`,
          `"${(prompt.content || '').replace(/"/g, '""')}"`,
          `"${prompt.categories?.name || ''}"`,
          `"${prompt.subcategory_groups?.name || ''}"`,
          `"${prompt.subcategory || ''}"`,
          prompt.rating || 0,
          prompt.usage_count || 0,
          `"${(prompt.tags || []).join(', ')}"`,
          prompt.created_at,
          prompt.updated_at
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompts_export_${date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${prompts.length} prompts exportados com sucesso!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar prompts');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const { data: prompts, error } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          content,
          subcategory,
          rating,
          usage_count,
          tags,
          created_at,
          updated_at,
          categories (name, slug),
          subcategory_groups (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!prompts || prompts.length === 0) {
        toast.error('Nenhum prompt para exportar');
        return;
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalPrompts: prompts.length,
        prompts: prompts.map(p => ({
          id: p.id,
          title: p.title,
          content: p.content,
          category: p.categories?.name || null,
          categorySlug: p.categories?.slug || null,
          group: p.subcategory_groups?.name || null,
          groupSlug: p.subcategory_groups?.slug || null,
          subcategory: p.subcategory,
          rating: p.rating,
          usageCount: p.usage_count,
          tags: p.tags,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompts_export_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${prompts.length} prompts exportados com sucesso!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar prompts');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportToCSV,
    exportToJSON
  };
}
