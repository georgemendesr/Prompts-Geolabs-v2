// Background service worker for Prompt Manager extension

const SUPABASE_URL = 'https://golnprwqozsycawtgchy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbG5wcndxb3pzeWNhd3RnY2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzAyNTEsImV4cCI6MjA4MzQ0NjI1MX0.RnUPilsUWTcVt5835apZZlLYtKt8V7uaux9o4sh0Di8';

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Menu for saving selected text as prompt
  chrome.contextMenus.create({
    id: 'save-as-prompt',
    title: 'Salvar como Prompt',
    contexts: ['selection']
  });

  // Menu for opening sidebar
  chrome.contextMenus.create({
    id: 'open-sidebar',
    title: 'Abrir Prompt Manager',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-as-prompt') {
    // Store selected text temporarily
    chrome.storage.local.set({ 
      pendingPrompt: {
        content: info.selectionText,
        sourceUrl: tab.url,
        sourceTitle: tab.title
      }
    });
    // Open popup for saving
    chrome.action.openPopup();
  } else if (info.menuItemId === 'open-sidebar') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// API helper functions
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || null);
    });
  });
}

async function makeRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Handle messages from popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    handleLogin(request.email, request.password)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'logout') {
    chrome.storage.local.remove(['authToken', 'user']);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getPrompts') {
    fetchPrompts(request.search, request.categoryId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getCategories') {
    fetchCategories()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'savePrompt') {
    savePrompt(request.prompt)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getSubcategoryGroups') {
    fetchSubcategoryGroups(request.categoryId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'copyPrompt') {
    updatePromptUsage(request.promptId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'checkAuth') {
    chrome.storage.local.get(['authToken', 'user'], (result) => {
      sendResponse({ 
        isAuthenticated: !!result.authToken,
        user: result.user 
      });
    });
    return true;
  }

  if (request.action === 'getFavorites') {
    fetchFavorites()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'addFavorite') {
    addFavorite(request.promptId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'removeFavorite') {
    removeFavorite(request.promptId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

async function handleLogin(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Login failed');
  }

  const data = await response.json();
  
  await chrome.storage.local.set({
    authToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user
  });

  return { success: true, user: data.user };
}

async function fetchPrompts(search = '', categoryId = null) {
  let query = 'prompts?select=*,categories(id,name,slug,icon,color),subcategory_groups(id,name,slug)&order=rating.desc.nullslast,usage_count.desc';
  
  if (categoryId) {
    query += `&category_id=eq.${categoryId}`;
  }
  
  if (search) {
    query += `&or=(title.ilike.*${search}*,content.ilike.*${search}*)`;
  }
  
  query += '&limit=50';
  
  return makeRequest(query);
}

async function fetchCategories() {
  return makeRequest('categories?select=*&order=sort_order.asc');
}

async function fetchSubcategoryGroups(categoryId) {
  let query = 'subcategory_groups?select=*&order=sort_order.asc';
  if (categoryId) {
    query += `&category_id=eq.${categoryId}`;
  }
  return makeRequest(query);
}

async function savePrompt(prompt) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Get user info
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) {
    throw new Error('User not found');
  }

  return makeRequest('prompts', {
    method: 'POST',
    headers: {
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      ...prompt,
      user_id: user.id
    })
  });
}

async function updatePromptUsage(promptId) {
  // First get current values
  const prompts = await makeRequest(`prompts?id=eq.${promptId}&select=usage_count`);
  const currentCount = prompts[0]?.usage_count || 0;

  return makeRequest(`prompts?id=eq.${promptId}`, {
    method: 'PATCH',
    headers: {
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      usage_count: currentCount + 1,
      last_used_at: new Date().toISOString()
    })
  });
}

async function fetchFavorites() {
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) {
    throw new Error('User not found');
  }
  
  return makeRequest(`favorites?user_id=eq.${user.id}&select=prompt_id`);
}

async function addFavorite(promptId) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const { user } = await chrome.storage.local.get(['user']);
  if (!user) {
    throw new Error('User not found');
  }

  return makeRequest('favorites', {
    method: 'POST',
    headers: {
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: user.id,
      prompt_id: promptId
    })
  });
}

async function removeFavorite(promptId) {
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) {
    throw new Error('User not found');
  }

  return makeRequest(`favorites?user_id=eq.${user.id}&prompt_id=eq.${promptId}`, {
    method: 'DELETE'
  });
}
