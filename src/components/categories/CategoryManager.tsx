import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCategoriesManagement,
  useSubcategoryGroupsManagement,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubcategoryGroup,
  useUpdateSubcategoryGroup,
  useDeleteSubcategoryGroup,
  Category,
  SubcategoryGroup,
} from '@/hooks/useCategories';
import { CategoryDialog } from './CategoryDialog';
import { SubcategoryGroupDialog } from './SubcategoryGroupDialog';

export function CategoryManager() {
  const { data: categories, isLoading: loadingCategories } = useCategoriesManagement();
  const { data: allGroups } = useSubcategoryGroupsManagement();
  
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createGroup = useCreateSubcategoryGroup();
  const updateGroup = useUpdateSubcategoryGroup();
  const deleteGroup = useDeleteSubcategoryGroup();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<SubcategoryGroup | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'group'; id: string; name: string } | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleNewGroup = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const handleEditGroup = (group: SubcategoryGroup, categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setItemToDelete({ type: 'category', id: category.id, name: category.name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteGroup = (group: SubcategoryGroup) => {
    setItemToDelete({ type: 'group', id: group.id, name: group.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'category') {
      deleteCategory.mutate(itemToDelete.id, {
        onSuccess: () => setDeleteConfirmOpen(false),
      });
    } else {
      deleteGroup.mutate(itemToDelete.id, {
        onSuccess: () => setDeleteConfirmOpen(false),
      });
    }
  };

  const handleSaveCategory = (data: { name: string; slug: string; icon?: string; color?: string; sort_order?: number }) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, updates: data },
        { onSuccess: () => setCategoryDialogOpen(false) }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => setCategoryDialogOpen(false),
      });
    }
  };

  const handleSaveGroup = (data: { name: string; slug: string; category_id: string; sort_order?: number }) => {
    if (editingGroup) {
      updateGroup.mutate(
        { id: editingGroup.id, updates: { name: data.name, slug: data.slug, sort_order: data.sort_order } },
        { onSuccess: () => setGroupDialogOpen(false) }
      );
    } else {
      createGroup.mutate(data, {
        onSuccess: () => setGroupDialogOpen(false),
      });
    }
  };

  const getGroupsForCategory = (categoryId: string) => {
    return allGroups?.filter(g => g.category_id === categoryId) || [];
  };

  if (loadingCategories) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Categorias</CardTitle>
            <CardDescription>Criar, editar e deletar categorias e grupos de subcategorias</CardDescription>
          </div>
          <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {categories && categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const groups = getGroupsForCategory(category.id);

              return (
                <div key={category.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-5 w-5 text-primary" />
                      ) : (
                        <Folder className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground">({category.slug})</span>
                      {category.sort_order !== null && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">#{category.sort_order}</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleNewGroup(category.id)}
                        title="Adicionar grupo"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                      {groups.length > 0 ? (
                        groups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-2 pl-8 hover:bg-muted/50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span>{group.name}</span>
                              <span className="text-xs text-muted-foreground">({group.slug})</span>
                              {group.sort_order !== null && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">#{group.sort_order}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditGroup(group, category.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteGroup(group)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground pl-8 py-2">
                          Nenhum grupo de subcategoria
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma categoria encontrada. Crie uma nova categoria para começar.
          </p>
        )}
      </CardContent>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      <SubcategoryGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        categoryId={selectedCategoryId}
        onSave={handleSaveGroup}
        isLoading={createGroup.isPending || updateGroup.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{itemToDelete?.name}"? 
              {itemToDelete?.type === 'category' && (
                <span className="block mt-2 text-destructive">
                  Isso também pode afetar prompts associados a esta categoria.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending || deleteGroup.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
