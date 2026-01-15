# Prompt Manager - Extensão Chrome

Extensão Chrome para buscar e salvar prompts diretamente do navegador.

## Funcionalidades

- 🔍 **Buscar prompts** - Pesquise seus prompts salvos por título ou conteúdo
- 💾 **Salvar prompts** - Salve texto selecionado como novo prompt via menu de contexto
- 📋 **Copiar rápido** - Copie prompts para a área de transferência com um clique
- 📂 **Navegar por categorias** - Explore prompts organizados por categoria
- 📌 **Sidebar** - Mantenha a sidebar aberta enquanto navega

## Instalação

### Modo Desenvolvedor

1. Faça download da pasta `chrome-extension`
2. Abra Chrome e vá para `chrome://extensions/`
3. Ative o **Modo do desenvolvedor** no canto superior direito
4. Clique em **Carregar sem compactação**
5. Selecione a pasta `chrome-extension`

### Ícones

Os ícones SVG GeoLabs já estão incluídos na pasta `icons/`:
- `icon16.svg` - Ícone pequeno (toolbar)
- `icon48.svg` - Ícone médio (gerenciador de extensões)
- `icon128.svg` - Ícone grande (Chrome Web Store)

## Como Usar

### Popup
- Clique no ícone da extensão na barra de ferramentas
- Faça login com suas credenciais
- Busque e copie prompts

### Sidebar
- Clique no botão de sidebar no popup OU
- Clique direito na página > "Abrir Prompt Manager"
- A sidebar fica aberta enquanto você navega

### Salvar Texto Selecionado
1. Selecione qualquer texto em uma página
2. Clique direito > "Salvar como Prompt"
3. Adicione título e categoria no popup que abre

## Estrutura

```
chrome-extension/
├── manifest.json      # Configuração da extensão
├── background.js      # Service worker (API calls)
├── popup.html/js/css  # Interface do popup
├── sidepanel.html/js/css # Interface da sidebar
└── icons/             # Ícones (criar manualmente)
```

## Segurança

- Suas credenciais são armazenadas localmente no Chrome
- A comunicação é feita via HTTPS com o backend
- Tokens expirados são automaticamente renovados
