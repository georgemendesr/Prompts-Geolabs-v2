import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, XCircle, FolderPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImportResult {
  inserted: number;
  updated: number;
  errors: number;
  groupsCreated: string[];
}

// CSV parsing - handles quoted fields correctly
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      }
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Parse "Grupo > Subcategoria" format
function parseCategoryPath(categoryPath: string): { group: string; subcategory: string } {
  const parts = categoryPath.split('>').map(p => p.trim());
  
  if (parts.length >= 3) {
    const subcategory = parts[parts.length - 1];
    const group = parts.slice(0, -1).join(' > ');
    return { group, subcategory };
  } else if (parts.length === 2) {
    return { group: parts[0], subcategory: parts[1] };
  } else {
    return { group: parts[0] || '', subcategory: '' };
  }
}

function generateTitle(subcategory: string, content: string): string {
  const preview = content.slice(0, 40).replace(/\n/g, ' ').trim();
  return subcategory ? `${subcategory}: ${preview}...` : `${preview}...`;
}

function generateLegacyId(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `legacy_${Math.abs(hash)}`;
}

function parseTags(comments: string, tags: string): string[] {
  const allTags: string[] = [];
  
  if (comments) {
    const commentTags = comments.split(/[,;]/).map(t => t.trim()).filter(Boolean);
    allTags.push(...commentTags);
  }
  
  if (tags) {
    const tagList = tags.split(/[,;]/).map(t => t.trim()).filter(Boolean);
    allTags.push(...tagList);
  }
  
  return [...new Set(allTags)].slice(0, 10);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const Import = () => {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows.slice(0, 6));
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file || !selectedCategory || !user) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const total = dataRows.length;

      // Find column indexes
      const textIdx = headers.findIndex(h => h.toLowerCase() === 'text');
      const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'category');
      const ratingIdx = headers.findIndex(h => h.toLowerCase() === 'rating');
      const commentsIdx = headers.findIndex(h => h.toLowerCase() === 'comments');
      const tagsIdx = headers.findIndex(h => h.toLowerCase() === 'tags');
      const createdIdx = headers.findIndex(h => h.toLowerCase().includes('created'));

      // Get existing subcategory groups for the category
      const { data: existingGroups } = await supabase
        .from('subcategory_groups')
        .select('id, name, slug')
        .eq('category_id', selectedCategory);

      const groupMap = new Map<string, string>();
      existingGroups?.forEach(g => {
        groupMap.set(g.name.toLowerCase(), g.id);
      });

      let maxSortOrder = existingGroups?.length || 0;
      const groupsCreated: string[] = [];

      // First pass: collect and create missing groups
      const groupsToCreate = new Set<string>();
      
      for (const row of dataRows) {
        const categoryPath = row[categoryIdx] || '';
        if (!categoryPath.trim()) continue;
        
        const { group } = parseCategoryPath(categoryPath);
        if (group && !groupMap.has(group.toLowerCase())) {
          groupsToCreate.add(group);
        }
      }

      // Create missing groups
      for (const groupName of groupsToCreate) {
        maxSortOrder++;
        const slug = slugify(groupName);
        
        const { data: newGroup, error } = await supabase
          .from('subcategory_groups')
          .insert({
            name: groupName,
            slug,
            category_id: selectedCategory,
            sort_order: maxSortOrder,
          })
          .select()
          .single();

        if (!error && newGroup) {
          groupMap.set(groupName.toLowerCase(), newGroup.id);
          groupsCreated.push(groupName);
        }
      }

      let inserted = 0;
      let updated = 0;
      let errors = 0;

      // Second pass: import prompts
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        try {
          const content = row[textIdx] || '';
          if (!content.trim()) continue;

          const categoryPath = row[categoryIdx] || '';
          const { group, subcategory } = parseCategoryPath(categoryPath);
          const rating = parseFloat(row[ratingIdx]) || 0;
          const comments = row[commentsIdx] || '';
          const tags = row[tagsIdx] || '';
          const createdAt = row[createdIdx] || new Date().toISOString();

          const legacyId = generateLegacyId(content);
          const title = generateTitle(subcategory, content);
          const groupId = group ? groupMap.get(group.toLowerCase()) : null;

          const promptData = {
            user_id: user.id,
            category_id: selectedCategory,
            subcategory_group_id: groupId || null,
            title,
            content,
            subcategory: subcategory || null,
            legacy_score: rating,
            tags: parseTags(comments, tags),
            legacy_id: legacyId,
            created_at: createdAt,
          };

          // Check if exists
          const { data: existing } = await supabase
            .from('prompts')
            .select('id')
            .eq('legacy_id', legacyId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('prompts')
              .update(promptData)
              .eq('id', existing.id);
            if (!error) updated++;
            else errors++;
          } else {
            const { error } = await supabase
              .from('prompts')
              .insert(promptData);
            if (!error) inserted++;
            else errors++;
          }
        } catch {
          errors++;
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setResult({ inserted, updated, errors, groupsCreated });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['subcategory-groups'] });
      
      const groupMsg = groupsCreated.length > 0 
        ? ` | ${groupsCreated.length} grupo(s) criado(s)` 
        : '';
      toast.success(`Importação concluída! ${inserted} novos, ${updated} atualizados${groupMsg}`);
    } catch (error) {
      toast.error('Erro durante a importação');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importar Prompts</h1>
          <p className="text-muted-foreground">
            Importe seus prompts de um arquivo CSV. Grupos serão criados automaticamente.
          </p>
        </div>

        {/* Dropzone */}
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p>Solte o arquivo aqui...</p>
              ) : (
                <div>
                  <p className="font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formato: Text, Category (Grupo {'>'} Subcategoria), Rating, Comments, Tags
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Selected */}
        {file && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                {file.name}
              </CardTitle>
              <CardDescription>
                {preview.length > 1 ? `${preview.length - 1} linhas de prévia` : 'Nenhum dado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Table */}
              {preview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {preview[0].map((header, i) => (
                          <th key={i} className="p-2 text-left font-medium text-muted-foreground">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1, 4).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 max-w-[150px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Category Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria principal</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Grupos serão extraídos automaticamente da coluna Category
                </p>
              </div>

              {/* Progress */}
              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">{progress}%</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      {result.inserted} novos
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <CheckCircle className="h-4 w-4" />
                      {result.updated} atualizados
                    </span>
                    {result.errors > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" />
                        {result.errors} erros
                      </span>
                    )}
                  </div>
                  {result.groupsCreated.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FolderPlus className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Grupos criados: {result.groupsCreated.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedCategory || importing}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Importar Prompts'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Import;
