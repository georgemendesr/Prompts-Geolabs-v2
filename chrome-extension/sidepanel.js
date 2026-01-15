// Sidepanel script for Prompt Manager extension

let categories = [];
let subcategoryGroups = [];
let expandedPrompt = null;

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
const tabs = document.querySelectorAll('.tab');
const tabContents = {
  search: document.getElementById('search-tab'),
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
    await loadCategories();
    await loadPrompts();
  } else {
    showLoginView();
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
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    Object.values(tabContents).forEach(content => content.classList.add('hidden'));
    tabContents[tab.dataset.tab].classList.remove('hidden');
    
    if (tab.dataset.tab === 'categories') {
      renderCategoryTree();
    }
  });
});

// Load categories
async function loadCategories() {
  const response = await chrome.runtime.sendMessage({ action: 'getCategories' });
  
  if (response.error) {
    console.error('Error loading categories:', response.error);
    return;
  }
  
  categories = response;
  populateCategorySelect();
}

// Populate category select in modal
function populateCategorySelect() {
  const categorySelect = document.getElementById('prompt-category');
  categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.icon || ''} ${cat.name}</option>`).join('');
}

// Load prompts
async function loadPrompts(search = '', categoryId = null) {
  const searchValue = search || searchInput.value.trim();
  
  const response = await chrome.runtime.sendMessage({
    action: 'getPrompts',
    search: searchValue,
    categoryId
  });
  
  if (response.error) {
    console.error('Error loading prompts:', response.error);
    promptsList.innerHTML = '<p class="error-message">Erro ao carregar prompts</p>';
    return;
  }
  
  renderPrompts(response);
}

// Render prompts
function renderPrompts(prompts) {
  if (prompts.length === 0) {
    promptsList.innerHTML = '<p class="empty-message">Nenhum prompt encontrado</p>';
    return;
  }
  
  promptsList.innerHTML = prompts.map(prompt => `
    <div class="prompt-card ${expandedPrompt === prompt.id ? 'prompt-expanded' : ''}" data-id="${prompt.id}">
      <div class="prompt-header">
        <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
        ${prompt.categories ? `
          <span class="prompt-category" style="background: ${prompt.categories.color || '#6366f1'}20; color: ${prompt.categories.color || '#6366f1'}">
            ${prompt.categories.icon || ''} ${prompt.categories.name}
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
  `).join('');
  
  // Add click handlers for expanding
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-copy')) return;
      
      const promptId = card.dataset.id;
      expandedPrompt = expandedPrompt === promptId ? null : promptId;
      renderPrompts(prompts);
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
          <span class="category-icon">${cat.icon || '📁'}</span>
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
  searchTimeout = setTimeout(() => loadPrompts(), 300);
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
