// Popup script for Prompt Manager extension

let currentCategory = '';
let categories = [];
let subcategoryGroups = [];
let favorites = new Set();

// DOM Elements
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const searchInput = document.getElementById('search-input');
const categoriesList = document.getElementById('categories-list');
const promptsList = document.getElementById('prompts-list');
const saveForm = document.getElementById('save-form');
const logoutBtn = document.getElementById('logout-btn');
const openSidebarBtn = document.getElementById('open-sidebar-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await checkPendingPrompt();
});

// Check authentication status
async function checkAuth() {
  const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
  
  if (response.isAuthenticated) {
    showMainView();
    await loadFavorites();
    await loadCategories();
    await loadPrompts();
  } else {
    showLoginView();
  }
}

// Check for pending prompt from context menu
async function checkPendingPrompt() {
  const { pendingPrompt } = await chrome.storage.local.get(['pendingPrompt']);
  
  if (pendingPrompt) {
    document.getElementById('prompt-content').value = pendingPrompt.content;
    document.getElementById('prompt-title').value = '';
    saveForm.classList.remove('hidden');
    promptsList.classList.add('hidden');
    
    // Clear pending prompt
    await chrome.storage.local.remove(['pendingPrompt']);
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

// Open sidebar
openSidebarBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.sidePanel.open({ windowId: tab.windowId });
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
  renderCategories();
}

// Render categories
function renderCategories() {
  categoriesList.innerHTML = categories.map(cat => `
    <button class="category-pill" data-category="${cat.id}">
      ${cat.name}
    </button>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', async (e) => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      await loadPrompts();
    });
  });

  // Populate save form category select
  const categorySelect = document.getElementById('prompt-category');
  categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

// Load prompts
async function loadPrompts() {
  const search = searchInput.value.trim();
  
  const response = await chrome.runtime.sendMessage({
    action: 'getPrompts',
    search,
    categoryId: currentCategory || null
  });
  
  if (response.error) {
    console.error('Error loading prompts:', response.error);
    promptsList.innerHTML = '<p class="error-message">Erro ao carregar prompts</p>';
    return;
  }
  
  renderPrompts(response);
}

// Render prompts grouped by subcategory
function renderPrompts(prompts) {
  if (prompts.length === 0) {
    promptsList.innerHTML = '<p class="empty-message">Nenhum prompt encontrado</p>';
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
    html += `
      <div class="subcategory-section">
        <div class="subcategory-header">${escapeHtml(groupName)}</div>
        ${grouped[groupName].map(prompt => renderPromptCard(prompt)).join('')}
      </div>
    `;
  });
  
  // Render ungrouped prompts
  if (ungrouped.length > 0) {
    if (Object.keys(grouped).length > 0) {
      html += `
        <div class="subcategory-section">
          <div class="subcategory-header">Outros</div>
          ${ungrouped.map(prompt => renderPromptCard(prompt)).join('')}
        </div>
      `;
    } else {
      html += ungrouped.map(prompt => renderPromptCard(prompt)).join('');
    }
  }
  
  promptsList.innerHTML = html;
  
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
      
      // Update button
      e.target.classList.toggle('active');
      e.target.textContent = favorites.has(promptId) ? '★' : '☆';
      e.target.title = favorites.has(promptId) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    });
  });
  
  // Add copy handlers
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
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

// Search handling with debounce
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadPrompts, 300);
});

// Category select change - load subcategory groups
document.getElementById('prompt-category').addEventListener('change', async (e) => {
  const categoryId = e.target.value;
  const subcategorySelect = document.getElementById('prompt-subcategory-group');
  
  if (!categoryId) {
    subcategorySelect.innerHTML = '<option value="">Selecione uma subcategoria</option>';
    subcategoryGroups = [];
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
  
  subcategoryGroups = response;
  subcategorySelect.innerHTML = '<option value="">Selecione uma subcategoria</option>' +
    subcategoryGroups.map(sg => `<option value="${sg.id}">${sg.name}</option>`).join('');
});

// Cancel save
document.getElementById('cancel-save').addEventListener('click', () => {
  saveForm.classList.add('hidden');
  promptsList.classList.remove('hidden');
  document.getElementById('prompt-title').value = '';
  document.getElementById('prompt-content').value = '';
  document.getElementById('prompt-category').value = '';
  document.getElementById('prompt-subcategory-group').value = '';
});

// Confirm save
document.getElementById('confirm-save').addEventListener('click', async () => {
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
  saveForm.classList.add('hidden');
  promptsList.classList.remove('hidden');
  document.getElementById('prompt-title').value = '';
  document.getElementById('prompt-content').value = '';
  document.getElementById('prompt-category').value = '';
  document.getElementById('prompt-subcategory-group').value = '';
  
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
    <div class="prompt-card" data-id="${prompt.id}">
      <div class="prompt-header">
        <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
        <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-id="${prompt.id}" title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
          ${isFavorite ? '★' : '☆'}
        </button>
        ${prompt.categories ? `
          <span class="prompt-category" style="background: ${prompt.categories.color || '#6366f1'}20; color: ${prompt.categories.color || '#6366f1'}">
            ${prompt.categories.icon || ''} ${prompt.categories.name}
          </span>
        ` : ''}
      </div>
      <p class="prompt-content">${escapeHtml(truncate(prompt.content, 100))}</p>
      <div class="prompt-actions">
        <button class="btn-copy" data-content="${escapeAttr(prompt.content)}" data-id="${prompt.id}">
          📋 Copiar
        </button>
        ${prompt.rating ? `<span class="prompt-rating">⭐ ${prompt.rating}</span>` : ''}
      </div>
    </div>
  `;
}
