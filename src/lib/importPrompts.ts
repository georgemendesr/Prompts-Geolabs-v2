import { supabase } from '@/integrations/supabase/client';

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

function extractSubcategory(categoryPath: string): string {
  const parts = categoryPath.split('>');
  return parts[parts.length - 1].trim();
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

// Map CSV categories to our master categories
function mapToMasterCategory(categoryPath: string): string {
  const lowerPath = categoryPath.toLowerCase();
  
  if (lowerPath.includes('reggae') || lowerPath.includes('music') || lowerPath.includes('selecionados')) {
    return 'musica';
  }
  if (lowerPath.includes('video') || lowerPath.includes('vídeo')) {
    return 'video';
  }
  if (lowerPath.includes('imagem') || lowerPath.includes('image')) {
    return 'imagem';
  }
  // Default to texto
  return 'musica'; // Based on the CSV content, most are music-related
}

export async function importPromptsFromCSV(userId: string): Promise<{ inserted: number; skipped: number }> {
  try {
    // Check if user already has prompts (skip if already imported)
    const { count } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count && count > 0) {
      return { inserted: 0, skipped: count };
    }

    // Fetch the CSV file
    const response = await fetch('/prompts_export_2026-01-08.csv');
    if (!response.ok) {
      console.error('CSV file not found');
      return { inserted: 0, skipped: 0 };
    }

    const text = await response.text();
    const rows = parseCSV(text);
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find column indexes
    const textIdx = headers.findIndex(h => h.toLowerCase() === 'text');
    const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'category');
    const ratingIdx = headers.findIndex(h => h.toLowerCase() === 'rating');
    const commentsIdx = headers.findIndex(h => h.toLowerCase() === 'comments');
    const tagsIdx = headers.findIndex(h => h.toLowerCase() === 'tags');
    const createdIdx = headers.findIndex(h => h.toLowerCase().includes('created'));

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug');

    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);

    const promptsToInsert = [];

    for (const row of dataRows) {
      const content = row[textIdx] || '';
      if (!content.trim()) continue;

      const categoryPath = row[categoryIdx] || '';
      const subcategory = extractSubcategory(categoryPath);
      const rating = parseFloat(row[ratingIdx]) || 0;
      const comments = row[commentsIdx] || '';
      const tags = row[tagsIdx] || '';
      const createdAt = row[createdIdx] || new Date().toISOString();
      
      const masterCategorySlug = mapToMasterCategory(categoryPath);
      const categoryId = categoryMap.get(masterCategorySlug);
      
      const legacyId = generateLegacyId(content);
      const title = generateTitle(subcategory, content);

      promptsToInsert.push({
        user_id: userId,
        category_id: categoryId || null,
        title,
        content,
        subcategory: subcategory || null,
        legacy_score: rating,
        rating: Math.max(0, Math.min(5, rating)), // Clamp to 0-5
        tags: parseTags(comments, tags),
        legacy_id: legacyId,
        created_at: createdAt,
      });
    }

    // Insert in batches of 100
    let inserted = 0;
    for (let i = 0; i < promptsToInsert.length; i += 100) {
      const batch = promptsToInsert.slice(i, i + 100);
      const { error } = await supabase.from('prompts').insert(batch);
      if (!error) {
        inserted += batch.length;
      } else {
        console.error('Batch insert error:', error);
      }
    }

    return { inserted, skipped: 0 };
  } catch (error) {
    console.error('Import error:', error);
    return { inserted: 0, skipped: 0 };
  }
}
