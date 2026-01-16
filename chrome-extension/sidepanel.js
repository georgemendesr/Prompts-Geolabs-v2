// Sidepanel script for Prompt Manager extension

let categories = [];
let subcategoryGroups = [];
let allSubcategoryGroups = [];
let allSubcategories = [];
let expandedPrompt = null;
let favorites = new Set();
let showFavoritesOnly = false;
let selectedCategoryId = null;
let selectedSubcategoryGroupId = null;
let selectedSubcategory = null;

// DOM Elements
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const searchInput = document.getElementById('search-input');
const promptsList = document.getElementById('prompts-list');
const categoryTree = document.getElementById('category-tree');
const saveModal = document.getElementById('save-modal');
const saveForm = document.getElementById('save-form');
const logoutBtn = document.getElementById('logout-btn');
const newPromptBtn = document.getElementById('new-prompt-btn');
const closeModalBtn = document.getElementById('close-modal');
const categoryFilter = document.getElementById('category-filter');
const subcategoryGroupFilter = document.getElementById('subcategory-group-filter');
const subcategoryFilter = document.getElementById('subcategory-filter');
const activeFiltersDiv = document.getElementById('active-filters');
const clearFiltersBtn = document.getElementById('clear-filters');
const tabs = document.querySelectorAll('.tab');
const tabContents = {
  search: document.getElementById('search-tab'),
  favorites: document.getElementById('search-tab'), // Reuse search tab for favorites
  categories: document.getElementById('categories-tab')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
});

// Check authentication status
async function checkAuth() {
  const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
  
  if (response.isAuthenticated) {
    showMainView();
    await loadFavorites();
    await loadCategories();
    await restoreFilters();
    await loadPrompts();
  } else {
    showLoginView();
  }
}

// Save filters to chrome.storage
async function saveFilters() {
  const filters = {
    categoryId: selectedCategoryId,
    subcategoryGroupId: selectedSubcategoryGroupId,
    subcategory: selectedSubcategory,
    searchText: searchInput.value
  };
  await chrome.storage.local.set({ savedFilters: filters });
}

// Restore filters from chrome.storage
async function restoreFilters() {
  const result = await chrome.storage.local.get('savedFilters');
  const filters = result.savedFilters;
  
  if (!filters) return;
  
  // Restore category
  if (filters.categoryId) {
    selectedCategoryId = filters.categoryId;
    categoryFilter.value = filters.categoryId;
    categoryFilter.classList.toggle('has-value', true);
    updateSubcategoryGroupFilter(filters.categoryId);
  }
  
  // Restore subcategory group
  if (filters.subcategoryGroupId) {
    selectedSubcategoryGroupId = filters.subcategoryGroupId;
    subcategoryGroupFilter.value = filters.subcategoryGroupId;
    subcategoryGroupFilter.classList.toggle('has-value', true);
    await updateSubcategoryFilter(filters.subcategoryGroupId);
  }
  
  // Restore subcategory
  if (filters.subcategory) {
    selectedSubcategory = filters.subcategory;
    subcategoryFilter.value = filters.subcategory;
    subcategoryFilter.classList.toggle('has-value', true);
  }
  
  // Restore search text
  if (filters.searchText) {
    searchInput.value = filters.searchText;
  }
}

// View switching
function showLoginView() {
  loginView.classList.remove('hidden');
  mainView.classList.add('hidden');
}

function showMainView() {
  loginView.classList.add('hidden');
  mainView.classList.remove('hidden');
}

// Login handling
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  loginError.classList.add('hidden');
  
  const response = await chrome.runtime.sendMessage({
    action: 'login',
    email,
    password
  });
  
  if (response.error) {
    loginError.textContent = response.error;
    loginError.classList.remove('hidden');
  } else {
    showMainView();
    await loadFavorites();
    await loadCategories();
    await loadPrompts();
  }
});

// Logout handling
logoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'logout' });
  showLoginView();
});

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const tabName = tab.dataset.tab;
    
    // Handle favorites tab
    if (tabName === 'favorites') {
      showFavoritesOnly = true;
      document.getElementById('search-tab').classList.remove('hidden');
      document.getElementById('categories-tab').classList.add('hidden');
      await loadPrompts();
    } else if (tabName === 'search') {
      showFavoritesOnly = false;
      document.getElementById('search-tab').classList.remove('hidden');
      document.getElementById('categories-tab').classList.add('hidden');
      await loadPrompts();
    } else if (tabName === 'categories') {
      showFavoritesOnly = false;
      document.getElementById('search-tab').classList.add('hidden');
      document.getElementById('categories-tab').classList.remove('hidden');
      renderCategoryTree();
    }
  });
});

// Load favorites
async function loadFavorites() {
  const response = await chrome.runtime.sendMessage({ action: 'getFavorites' });
  
  if (response.error) {
    console.error('Error loading favorites:', response.error);
    return;
  }
  
  favorites = new Set(response.map(f => f.prompt_id));
}

// Load categories
async function loadCategories() {
  const response = await chrome.runtime.sendMessage({ action: 'getCategories' });
  
  if (response.error) {
    console.error('Error loading categories:', response.error);
    return;
  }
  
  categories = response;
  populateCategorySelect();
  populateCategoryFilter();
  await loadAllSubcategoryGroups();
}

// Load all subcategory groups for filtering
async function loadAllSubcategoryGroups() {
  const groupsPromises = categories.map(cat => 
    chrome.runtime.sendMessage({ action: 'getSubcategoryGroups', categoryId: cat.id })
  );
  
  const groupsResults = await Promise.all(groupsPromises);
  
  allSubcategoryGroups = [];
  categories.forEach((cat, index) => {
    const groups = groupsResults[index] || [];
    groups.forEach(g => {
      allSubcategoryGroups.push({
        ...g,
        categoryId: cat.id,
        categoryName: cat.name
      });
    });
  });
}

// Populate category filter dropdown
function populateCategoryFilter() {
  categoryFilter.innerHTML = '<option value="">Categorias</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

// Update subcategory group filter based on selected category
function updateSubcategoryGroupFilter(categoryId) {
  let groups = allSubcategoryGroups;
  
  if (categoryId) {
    groups = allSubcategoryGroups.filter(g => g.categoryId === categoryId);
  }
  
  subcategoryGroupFilter.innerHTML = '<option value="">Grupos</option>' +
    groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  
  subcategoryGroupFilter.classList.toggle('has-value', false);
  
  // Reset subcategory filter
  subcategoryFilter.innerHTML = '<option value="">Subcategorias</option>';
  subcategoryFilter.classList.toggle('has-value', false);
}

// Update subcategory filter based on selected subcategory group
async function updateSubcategoryFilter(subcategoryGroupId) {
  if (!subcategoryGroupId) {
    subcategoryFilter.innerHTML = '<option value="">Subcategorias</option>';
    subcategoryFilter.classList.toggle('has-value', false);
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    action: 'getSubcategories',
    subcategoryGroupId
  });
  
  if (response.error) {
    console.error('Error loading subcategories:', response.error);
    return;
  }
  
  allSubcategories = response;
  subcategoryFilter.innerHTML = '<option value="">Subcategorias</option>' +
    response.map(sub => `<option value="${sub.name}">${sub.name} (${sub.count})</option>`).join('');
  
  subcategoryFilter.classList.toggle('has-value', false);
}

// Update active filters display
function updateActiveFiltersDisplay() {
  const parts = [];
  
  if (selectedCategoryId) {
    const cat = categories.find(c => c.id === selectedCategoryId);
    if (cat) parts.push(cat.name.toUpperCase());
  }
  
  if (selectedSubcategoryGroupId) {
    const group = allSubcategoryGroups.find(g => g.id === selectedSubcategoryGroupId);
    if (group) parts.push(group.name.toUpperCase());
  }
  
  if (selectedSubcategory) {
    parts.push(selectedSubcategory.toUpperCase());
  }
  
  if (parts.length > 0) {
    activeFiltersDiv.innerHTML = `<span class="filter-breadcrumb">${parts.join(' → ')}</span>`;
    activeFiltersDiv.classList.add('visible');
  } else {
    activeFiltersDiv.innerHTML = '';
    activeFiltersDiv.classList.remove('visible');
  }
}

// Populate category select in modal
function populateCategorySelect() {
  const categorySelect = document.getElementById('prompt-category');
  categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

// Load prompts
async function loadPrompts(search = '', categoryId = null, subcategoryGroupId = null, subcategory = null) {
  const searchValue = search || searchInput.value.trim();
  const catId = categoryId !== null ? categoryId : selectedCategoryId;
  const subGroupId = subcategoryGroupId !== null ? subcategoryGroupId : selectedSubcategoryGroupId;
  const subcat = subcategory !== null ? subcategory : selectedSubcategory;
  
  const response = await chrome.runtime.sendMessage({
    action: 'getPrompts',
    search: searchValue,
    categoryId: catId
  });
  
  if (response.error) {
    console.error('Error loading prompts:', response.error);
    promptsList.innerHTML = '<p class="error-message">Erro ao carregar prompts</p>';
    return;
  }
  
  // Filter by subcategory group if selected
  let prompts = response;
  if (subGroupId) {
    prompts = prompts.filter(p => p.subcategory_group_id === subGroupId);
  }
  
  // Filter by subcategory if selected
  if (subcat) {
    prompts = prompts.filter(p => p.subcategory === subcat);
  }
  
  // Filter by favorites if needed
  if (showFavoritesOnly) {
    prompts = prompts.filter(p => favorites.has(p.id));
  }
  
  // Update active filters display
  updateActiveFiltersDisplay();
  
  renderPrompts(prompts);
}

// Render prompts grouped by subcategory
function renderPrompts(prompts) {
  if (prompts.length === 0) {
    promptsList.innerHTML = showFavoritesOnly 
      ? '<p class="empty-message">Nenhum favorito encontrado</p>'
      : '<p class="empty-message">Nenhum prompt encontrado</p>';
    return;
  }
  
  // Group prompts by subcategory_groups
  const grouped = {};
  const ungrouped = [];
  
  prompts.forEach(prompt => {
    if (prompt.subcategory_groups && prompt.subcategory_groups.name) {
      const groupName = prompt.subcategory_groups.name;
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(prompt);
    } else if (prompt.subcategory) {
      const subName = prompt.subcategory;
      if (!grouped[subName]) {
        grouped[subName] = [];
      }
      grouped[subName].push(prompt);
    } else {
      ungrouped.push(prompt);
    }
  });
  
  let html = '';
  
  // Render grouped prompts
  Object.keys(grouped).sort().forEach(groupName => {
    const count = grouped[groupName].length;
    html += `
      <div class="subcategory-section">
        <div class="subcategory-header">
          ${escapeHtml(groupName)}
          <span class="count">${count}</span>
        </div>
        ${grouped[groupName].map(prompt => renderPromptCard(prompt)).join('')}
      </div>
    `;
  });
  
  // Render ungrouped prompts
  if (ungrouped.length > 0) {
    if (Object.keys(grouped).length > 0) {
      html += `
        <div class="subcategory-section">
          <div class="subcategory-header">
            Outros
            <span class="count">${ungrouped.length}</span>
          </div>
          ${ungrouped.map(prompt => renderPromptCard(prompt)).join('')}
        </div>
      `;
    } else {
      html += ungrouped.map(prompt => renderPromptCard(prompt)).join('');
    }
  }
  
  promptsList.innerHTML = html;
  
  // Add click handlers for expanding
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-copy') || e.target.classList.contains('btn-favorite')) return;
      
      const promptId = card.dataset.id;
      expandedPrompt = expandedPrompt === promptId ? null : promptId;
      renderPrompts(prompts);
    });
  });
  
  // Add favorite handlers
  document.querySelectorAll('.btn-favorite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const promptId = e.target.dataset.id;
      const isFavorite = favorites.has(promptId);
      
      if (isFavorite) {
        await chrome.runtime.sendMessage({ action: 'removeFavorite', promptId });
        favorites.delete(promptId);
      } else {
        await chrome.runtime.sendMessage({ action: 'addFavorite', promptId });
        favorites.add(promptId);
      }
      
      // Re-render if showing favorites only
      if (showFavoritesOnly) {
        const filtered = prompts.filter(p => favorites.has(p.id));
        renderPrompts(filtered);
      } else {
        // Update button
        e.target.classList.toggle('active');
        e.target.textContent = favorites.has(promptId) ? '★' : '☆';
        e.target.title = favorites.has(promptId) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
      }
    });
  });
  
  // Add copy handlers
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const content = e.target.dataset.content;
      const promptId = e.target.dataset.id;
      
      await navigator.clipboard.writeText(content);
      
      // Update usage
      await chrome.runtime.sendMessage({
        action: 'copyPrompt',
        promptId
      });
      
      // Visual feedback
      const originalText = e.target.textContent;
      e.target.textContent = '✅ Copiado!';
      setTimeout(() => {
        e.target.textContent = originalText;
      }, 1500);
    });
  });
}

// Render category tree
async function renderCategoryTree() {
  // Load subcategory groups for all categories
  const groupsPromises = categories.map(cat => 
    chrome.runtime.sendMessage({ action: 'getSubcategoryGroups', categoryId: cat.id })
  );
  
  const groupsResults = await Promise.all(groupsPromises);
  
  categoryTree.innerHTML = categories.map((cat, index) => {
    const groups = groupsResults[index] || [];
    
    return `
      <div class="category-item">
        <div class="category-header" data-category="${cat.id}">
          <span class="category-name">${cat.name}</span>
        </div>
        ${groups.length > 0 ? `
          <div class="subcategory-list">
            ${groups.map(g => `
              <div class="subcategory-item" data-category="${cat.id}" data-subcategory="${g.id}">
                ${g.name}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // Add click handlers
  document.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', async () => {
      const categoryId = header.dataset.category;
      
      // Switch to search tab
      tabs.forEach(t => t.classList.remove('active'));
      tabs[0].classList.add('active');
      Object.values(tabContents).forEach(content => content.classList.add('hidden'));
      tabContents.search.classList.remove('hidden');
      
      await loadPrompts('', categoryId);
    });
  });
  
  document.querySelectorAll('.subcategory-item').forEach(item => {
    item.addEventListener('click', async () => {
      const categoryId = item.dataset.category;
      
      // Switch to search tab and filter
      tabs.forEach(t => t.classList.remove('active'));
      tabs[0].classList.add('active');
      Object.values(tabContents).forEach(content => content.classList.add('hidden'));
      tabContents.search.classList.remove('hidden');
      
      await loadPrompts('', categoryId);
    });
  });
}

// Search handling with debounce
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    await saveFilters();
    await loadPrompts();
  }, 300);
});

// Category filter change
categoryFilter.addEventListener('change', async (e) => {
  selectedCategoryId = e.target.value || null;
  selectedSubcategoryGroupId = null;
  selectedSubcategory = null;
  subcategoryGroupFilter.value = '';
  subcategoryFilter.value = '';
  
  // Update visual indicators
  categoryFilter.classList.toggle('has-value', !!selectedCategoryId);
  subcategoryGroupFilter.classList.toggle('has-value', false);
  subcategoryFilter.classList.toggle('has-value', false);
  
  // Update subcategory group options
  updateSubcategoryGroupFilter(selectedCategoryId);
  
  await saveFilters();
  await loadPrompts();
});

// Subcategory group filter change
subcategoryGroupFilter.addEventListener('change', async (e) => {
  selectedSubcategoryGroupId = e.target.value || null;
  selectedSubcategory = null;
  subcategoryFilter.value = '';
  
  // Update visual indicators
  subcategoryGroupFilter.classList.toggle('has-value', !!selectedSubcategoryGroupId);
  subcategoryFilter.classList.toggle('has-value', false);
  
  // Update subcategory options
  await updateSubcategoryFilter(selectedSubcategoryGroupId);
  
  await saveFilters();
  await loadPrompts();
});

// Subcategory filter change
subcategoryFilter.addEventListener('change', async (e) => {
  selectedSubcategory = e.target.value || null;
  
  // Update visual indicator
  subcategoryFilter.classList.toggle('has-value', !!selectedSubcategory);
  
  await saveFilters();
  await loadPrompts();
});

// Clear filters button
clearFiltersBtn.addEventListener('click', async () => {
  selectedCategoryId = null;
  selectedSubcategoryGroupId = null;
  selectedSubcategory = null;
  categoryFilter.value = '';
  subcategoryGroupFilter.value = '';
  subcategoryFilter.value = '';
  searchInput.value = '';
  
  // Remove visual indicators
  categoryFilter.classList.remove('has-value');
  subcategoryGroupFilter.classList.remove('has-value');
  subcategoryFilter.classList.remove('has-value');
  
  // Reset filters
  updateSubcategoryGroupFilter(null);
  
  await saveFilters();
  await loadPrompts();
});

// New prompt button
newPromptBtn.addEventListener('click', () => {
  saveModal.classList.remove('hidden');
});

// Close modal
closeModalBtn.addEventListener('click', () => {
  saveModal.classList.add('hidden');
  saveForm.reset();
});

// Close modal on backdrop click
saveModal.addEventListener('click', (e) => {
  if (e.target === saveModal) {
    saveModal.classList.add('hidden');
    saveForm.reset();
  }
});

// Category select change - load subcategory groups
document.getElementById('prompt-category').addEventListener('change', async (e) => {
  const categoryId = e.target.value;
  const subcategorySelect = document.getElementById('prompt-subcategory-group');
  
  if (!categoryId) {
    subcategorySelect.innerHTML = '<option value="">Selecione uma subcategoria</option>';
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    action: 'getSubcategoryGroups',
    categoryId
  });
  
  if (response.error) {
    console.error('Error loading subcategory groups:', response.error);
    return;
  }
  
  subcategorySelect.innerHTML = '<option value="">Selecione uma subcategoria</option>' +
    response.map(sg => `<option value="${sg.id}">${sg.name}</option>`).join('');
});

// Save form submit
saveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('prompt-title').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  const categoryId = document.getElementById('prompt-category').value;
  const subcategoryGroupId = document.getElementById('prompt-subcategory-group').value;
  
  if (!title || !content) {
    alert('Título e conteúdo são obrigatórios');
    return;
  }
  
  const response = await chrome.runtime.sendMessage({
    action: 'savePrompt',
    prompt: {
      title,
      content,
      category_id: categoryId || null,
      subcategory_group_id: subcategoryGroupId || null
    }
  });
  
  if (response.error) {
    alert('Erro ao salvar: ' + response.error);
    return;
  }
  
  // Success
  saveModal.classList.add('hidden');
  saveForm.reset();
  await loadPrompts();
});

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Render a single prompt card
function renderPromptCard(prompt) {
  const isFavorite = favorites.has(prompt.id);
  return `
    <div class="prompt-card ${expandedPrompt === prompt.id ? 'prompt-expanded' : ''}" data-id="${prompt.id}">
      <div class="prompt-header">
        <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
        <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-id="${prompt.id}" title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
          ${isFavorite ? '★' : '☆'}
        </button>
        ${prompt.categories ? `
          <span class="prompt-category" style="background: ${prompt.categories.color || '#6366f1'}20; color: ${prompt.categories.color || '#6366f1'}">
            ${prompt.categories.name}
          </span>
        ` : ''}
      </div>
      ${expandedPrompt === prompt.id ? `
        <div class="prompt-full-content">${escapeHtml(prompt.content)}</div>
      ` : `
        <p class="prompt-content">${escapeHtml(truncate(prompt.content, 120))}</p>
      `}
      <div class="prompt-actions">
        <button class="btn-copy" data-content="${escapeAttr(prompt.content)}" data-id="${prompt.id}">
          📋 Copiar
        </button>
        <div class="prompt-meta">
          ${prompt.rating ? `<span>⭐ ${prompt.rating}</span>` : ''}
          ${prompt.usage_count ? `<span>📊 ${prompt.usage_count}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}
