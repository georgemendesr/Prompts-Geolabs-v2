import JSZip from "jszip";
import { useState } from "react";
import { Download, Chrome, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";

// All extension file contents embedded
const FILES: Record<string, string> = {
  "manifest.json": JSON.stringify({
    manifest_version: 3,
    name: "Geolabs - Super Prompts",
    version: "1.0.0",
    description: "Busque e salve prompts diretamente do navegador",
    permissions: ["storage", "activeTab", "contextMenus", "sidePanel"],
    host_permissions: ["https://golnprwqozsycawtgchy.supabase.co/*"],
    action: {
      default_popup: "popup.html",
      default_icon: { "16": "icons/logo-geolabs.png", "48": "icons/logo-geolabs.png", "128": "icons/logo-geolabs.png" }
    },
    side_panel: { default_path: "sidepanel.html" },
    background: { service_worker: "background.js" },
    icons: { "16": "icons/logo-geolabs.png", "48": "icons/logo-geolabs.png", "128": "icons/logo-geolabs.png" }
  }, null, 2),

  "background.js": `// Background service worker for Prompt Manager extension

const SUPABASE_URL = 'https://golnprwqozsycawtgchy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbG5wcndxb3pzeWNhd3RnY2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzAyNTEsImV4cCI6MjA4MzQ0NjI1MX0.RnUPilsUWTcVt5835apZZlLYtKt8V7uaux9o4sh0Di8';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'save-as-prompt', title: 'Salvar como Prompt', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'open-sidebar', title: 'Abrir Prompt Manager', contexts: ['page'] });
  chrome.sidePanel.setOptions({ enabled: true });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-as-prompt') {
    chrome.storage.local.set({ pendingPrompt: { content: info.selectionText, sourceUrl: tab.url, sourceTitle: tab.title } });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'open-sidebar') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

async function getAuthToken() {
  return new Promise((resolve) => { chrome.storage.local.get(['authToken'], (result) => { resolve(result.authToken || null); }); });
}

async function refreshTokenIfNeeded() {
  return new Promise(async (resolve) => {
    const data = await chrome.storage.local.get(['authToken', 'refreshToken', 'tokenExpiry']);
    if (!data.authToken || !data.refreshToken) { resolve(false); return; }
    const now = Date.now();
    const expiry = data.tokenExpiry || 0;
    if (now < expiry - 300000) { resolve(true); return; }
    try {
      const response = await fetch(\`\${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token\`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: data.refreshToken })
      });
      if (!response.ok) { await chrome.storage.local.remove(['authToken', 'refreshToken', 'user', 'tokenExpiry']); resolve(false); return; }
      const newData = await response.json();
      const expiresIn = newData.expires_in || 3600;
      const newExpiry = Date.now() + (expiresIn * 1000);
      await chrome.storage.local.set({ authToken: newData.access_token, refreshToken: newData.refresh_token, tokenExpiry: newExpiry, user: newData.user });
      resolve(true);
    } catch (error) { console.error('Token refresh failed:', error); resolve(false); }
  });
}

async function makeRequest(endpoint, options = {}) {
  await refreshTokenIfNeeded();
  const token = await getAuthToken();
  const headers = { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', ...(token && { 'Authorization': \`Bearer \${token}\` }), ...options.headers };
  const response = await fetch(\`\${SUPABASE_URL}/rest/v1/\${endpoint}\`, { ...options, headers });
  if (!response.ok) { throw new Error(\`API Error: \${response.status}\`); }
  return response.json();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') { handleLogin(request.email, request.password).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'logout') { chrome.storage.local.remove(['authToken', 'user']); sendResponse({ success: true }); return true; }
  if (request.action === 'getPrompts') { fetchPrompts(request.search, request.categoryId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'getCategories') { fetchCategories().then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'savePrompt') { savePrompt(request.prompt).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'getSubcategoryGroups') { fetchSubcategoryGroups(request.categoryId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'getSubcategories') { fetchSubcategories(request.subcategoryGroupId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'copyPrompt') { updatePromptUsage(request.promptId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'checkAuth') {
    (async () => {
      const isValid = await refreshTokenIfNeeded();
      const { authToken, user } = await chrome.storage.local.get(['authToken', 'user']);
      sendResponse({ isAuthenticated: isValid && !!authToken, user });
    })();
    return true;
  }
  if (request.action === 'getFavorites') { fetchFavorites().then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'addFavorite') { addFavorite(request.promptId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
  if (request.action === 'removeFavorite') { removeFavorite(request.promptId).then(sendResponse).catch(error => sendResponse({ error: error.message })); return true; }
});

async function handleLogin(email, password) {
  const response = await fetch(\`\${SUPABASE_URL}/auth/v1/token?grant_type=password\`, {
    method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) { const error = await response.json(); throw new Error(error.error_description || 'Login failed'); }
  const data = await response.json();
  const expiresIn = data.expires_in || 3600;
  const tokenExpiry = Date.now() + (expiresIn * 1000);
  await chrome.storage.local.set({ authToken: data.access_token, refreshToken: data.refresh_token, tokenExpiry, user: data.user });
  return { success: true, user: data.user };
}

async function fetchPrompts(search = '', categoryId = null) {
  let query = 'prompts?select=*,categories(id,name,slug,icon,color),subcategory_groups(id,name,slug)&order=rating.desc.nullslast,usage_count.desc';
  if (categoryId) { query += \`&category_id=eq.\${categoryId}\`; }
  if (search && search.length <= 100) {
    const sanitized = search.replace(/[*%,\\.\\(\\)]/g, '').trim();
    if (sanitized.length > 0) { query += \`&or=(title.ilike.*\${sanitized}*,content.ilike.*\${sanitized}*)\`; }
  }
  query += '&limit=50';
  return makeRequest(query);
}

async function fetchCategories() { return makeRequest('categories?select=*&order=sort_order.asc'); }
async function fetchSubcategoryGroups(categoryId) {
  let query = 'subcategory_groups?select=*&order=sort_order.asc';
  if (categoryId) { query += \`&category_id=eq.\${categoryId}\`; }
  return makeRequest(query);
}

async function fetchSubcategories(subcategoryGroupId) {
  if (!subcategoryGroupId) { return []; }
  const prompts = await makeRequest(\`prompts?select=subcategory&subcategory_group_id=eq.\${subcategoryGroupId}\`);
  const counts = {};
  prompts.forEach(p => { if (p.subcategory) { counts[p.subcategory] = (counts[p.subcategory] || 0) + 1; } });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

async function savePrompt(prompt) {
  const token = await getAuthToken();
  if (!token) { throw new Error('Not authenticated'); }
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) { throw new Error('User not found'); }
  return makeRequest('prompts', { method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify({ ...prompt, user_id: user.id }) });
}

async function updatePromptUsage(promptId) {
  const prompts = await makeRequest(\`prompts?id=eq.\${promptId}&select=usage_count\`);
  const currentCount = prompts[0]?.usage_count || 0;
  return makeRequest(\`prompts?id=eq.\${promptId}\`, { method: 'PATCH', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify({ usage_count: currentCount + 1, last_used_at: new Date().toISOString() }) });
}

async function fetchFavorites() {
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) { throw new Error('User not found'); }
  return makeRequest(\`favorites?user_id=eq.\${user.id}&select=prompt_id\`);
}

async function addFavorite(promptId) {
  const token = await getAuthToken();
  if (!token) { throw new Error('Not authenticated'); }
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) { throw new Error('User not found'); }
  return makeRequest('favorites', { method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify({ user_id: user.id, prompt_id: promptId }) });
}

async function removeFavorite(promptId) {
  const { user } = await chrome.storage.local.get(['user']);
  if (!user) { throw new Error('User not found'); }
  return makeRequest(\`favorites?user_id=eq.\${user.id}&prompt_id=eq.\${promptId}\`, { method: 'DELETE' });
}`,

  "popup.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Manager</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <div id="login-view" class="view hidden">
      <div class="header">
        <div class="logo">
          <img src="icons/logo-geolabs.png" alt="GeoLabs" width="32" height="32">
          <span>GeoLabs</span>
        </div>
      </div>
      <form id="login-form" class="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Senha" required>
        <button type="submit" class="btn-primary">Entrar</button>
        <p id="login-error" class="error hidden"></p>
      </form>
    </div>
    <div id="main-view" class="view hidden">
      <div class="header">
        <div class="logo-small">
          <img src="icons/logo-geolabs.png" alt="GeoLabs" width="24" height="24">
          <span>Prompts</span>
        </div>
        <div class="header-actions">
          <button id="open-sidebar-btn" class="btn-icon" title="Abrir Sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          <button id="logout-btn" class="btn-icon" title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="search-container">
        <input type="text" id="search-input" placeholder="Buscar prompts...">
      </div>
      <div class="categories-container">
        <button class="category-pill active" data-category="">Todos</button>
        <div id="categories-list"></div>
      </div>
      <div id="prompts-list" class="prompts-list"></div>
      <div id="save-form" class="save-form hidden">
        <h3>Salvar Novo Prompt</h3>
        <input type="text" id="prompt-title" placeholder="Título do prompt" required>
        <textarea id="prompt-content" rows="4" placeholder="Conteúdo do prompt"></textarea>
        <select id="prompt-category"><option value="">Selecione uma categoria</option></select>
        <select id="prompt-subcategory-group"><option value="">Selecione uma subcategoria</option></select>
        <div class="form-actions">
          <button id="cancel-save" class="btn-secondary">Cancelar</button>
          <button id="confirm-save" class="btn-primary">Salvar</button>
        </div>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,
};

const STEPS = [
  "Baixe o arquivo ZIP clicando no botão abaixo",
  "Extraia a pasta em qualquer local do seu computador",
  "Abra o Chrome e acesse chrome://extensions/",
  'Ative o "Modo do desenvolvedor" no canto superior direito',
  'Clique em "Carregar sem compactação"',
  "Selecione a pasta extraída da extensão",
];

export default function ChromeExtension() {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("geolabs-super-prompts");

      // Add text files
      Object.entries(FILES).forEach(([name, content]) => {
        folder!.file(name, content);
      });

      // Fetch and add binary files from public/extension assets
      const iconResponse = await fetch("/favicon.png");
      const iconBlob = await iconResponse.blob();
      folder!.folder("icons")!.file("logo-geolabs.png", iconBlob);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "geolabs-super-prompts-extension.zip";
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Chrome className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Extensão Chrome</h1>
          <p className="text-muted-foreground">
            Acesse seus prompts diretamente do navegador
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Download da Extensão
            </CardTitle>
            <CardDescription>
              Baixe o ZIP e instale manualmente no Chrome
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
              size="lg"
            >
              {done ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Download concluído!
                </>
              ) : downloading ? (
                <>
                  <Download className="w-5 h-5 mr-2 animate-bounce" />
                  Gerando ZIP...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Extensão (.zip)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como Instalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm pt-0.5">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
