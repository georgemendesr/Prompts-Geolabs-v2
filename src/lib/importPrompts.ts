import { supabase } from '@/integrations/supabase/client';

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
// Example: "Selecionados > Reggae Master" => { group: "Selecionados", subcategory: "Reggae Master" }
// Example: "METATAGS > Refrão - Intensidade" => { group: "METATAGS", subcategory: "Refrão - Intensidade" }
// Example: "Projetos > Som do Coração > LO-FI" => { group: "Projetos > Som do Coração", subcategory: "LO-FI" }
function parseCategoryPath(categoryPath: string): { group: string; subcategory: string } {
  const parts = categoryPath.split('>').map(p => p.trim());
  
  if (parts.length >= 3) {
    // "Projetos > Som do Coração > LO-FI" => group="Projetos > Som do Coração", subcategory="LO-FI"
    const subcategory = parts[parts.length - 1];
    const group = parts.slice(0, -1).join(' > ');
    return { group, subcategory };
  } else if (parts.length === 2) {
    // "Selecionados > Reggae Master" => group="Selecionados", subcategory="Reggae Master"
    return { group: parts[0], subcategory: parts[1] };
  } else {
    // Single value like "Diversos"
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
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ImportProgress {
  current: number;
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  groupsCreated: string[];
}

export async function importPromptsFromCSV(
  userId: string,
  categoryId: string, // The master category to use (e.g., "Música" id)
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    current: 0,
    total: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    groupsCreated: [],
  };

  try {
    // Fetch the CSV file
    const response = await fetch('/prompts_export_2026-01-08.csv');
    if (!response.ok) {
      console.error('CSV file not found');
      return progress;
    }

    const text = await response.text();
    const rows = parseCSV(text);
    const headers = rows[0];
    const dataRows = rows.slice(1);
    progress.total = dataRows.length;

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
      .eq('category_id', categoryId);

    // Map: group name -> group id
    const groupMap = new Map<string, string>();
    existingGroups?.forEach(g => {
      groupMap.set(g.name.toLowerCase(), g.id);
    });

    // Get max sort_order for new groups
    let maxSortOrder = existingGroups?.length || 0;

    // First pass: collect unique groups that need to be created
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
          category_id: categoryId,
          sort_order: maxSortOrder,
        })
        .select()
        .single();

      if (!error && newGroup) {
        groupMap.set(groupName.toLowerCase(), newGroup.id);
        progress.groupsCreated.push(groupName);
      }
    }

    // Second pass: import prompts
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      progress.current = i + 1;
      
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
          user_id: userId,
          category_id: categoryId,
          subcategory_group_id: groupId || null,
          title,
          content,
          subcategory: subcategory || null,
          legacy_score: rating,
          rating: Math.max(0, Math.min(5, rating)), // Clamp to 0-5
          tags: parseTags(comments, tags),
          legacy_id: legacyId,
          created_at: createdAt,
        };

        // Check if exists by legacy_id
        const { data: existing } = await supabase
          .from('prompts')
          .select('id')
          .eq('legacy_id', legacyId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('prompts')
            .update(promptData)
            .eq('id', existing.id);
          
          if (!error) {
            progress.updated++;
          } else {
            progress.errors++;
          }
        } else {
          const { error } = await supabase
            .from('prompts')
            .insert(promptData);
          
          if (!error) {
            progress.inserted++;
          } else {
            progress.errors++;
          }
        }
      } catch {
        progress.errors++;
      }

      // Report progress every 10 items or at the end
      if (onProgress && (i % 10 === 0 || i === dataRows.length - 1)) {
        onProgress({ ...progress });
      }
    }

    return progress;
  } catch (error) {
    console.error('Import error:', error);
    return progress;
  }
}
