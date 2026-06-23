# Allvino App - Progresso UX/UI
## Data: 23 de Junho de 2026

---

## 1. Design System Implementado

### Arquivos Criados
| Arquivo | Descricao |
|---------|-----------|
| `src/styles/tokens.css` | Design tokens centralizados (cores, espacamentos, tipografia, sombras, transicoes) |
| `src/components/ui/Button.tsx` | Botao com 4 variantes (primary, secondary, ghost, danger) e 3 tamanhos |
| `src/components/ui/Input.tsx` | Input com label e estado de erro |
| `src/components/ui/Modal.tsx` | Modal com Header/Body/Footer + ESC para fechar |
| `src/components/ui/Card.tsx` | Card com CardHeader sub-component |
| `src/components/ui/Badge.tsx` | Badge com 6 variantes de cor |
| `src/components/ui/IconButton.tsx` | Botao de icone com badge |
| `src/components/ui/Checkbox.tsx` | Checkbox com label e descricao |
| `src/components/ui/Skeleton.tsx` | Componentes de skeleton loading |
| `src/components/ui/index.ts` | Barrel exports |

### Arquivos Modificados
| Arquivo | Mudanca |
|---------|----------|
| `src/app/globals.css` | Importa tokens.css e usa CSS variables |
| `src/components/layout/Header.tsx` | Usa IconButton com badge |
| `src/components/cart/CartOverlay.tsx` | Usa IconButton, Button, Checkbox |
| `src/components/auth/AuthModal.tsx` | Usa Modal, Input, Button |
| `src/components/layout/Navbar.tsx` | Abordagem data-driven |

---

## 2. Skeleton Loading

### Implementacao
- **WineCardSkeleton**: Grid de 6 skeletons durante carregamento do catalogo
- **WineDetailSkeleton**: Skeleton completo para pagina de detalhes do vinho
- **Animacao**: `animate-pulse` com `bg-stone-200`

### Arquivos
| Arquivo | Mudanca |
|---------|----------|
| `src/components/ui/Skeleton.tsx` | Novo - Skeleton, WineCardSkeleton, WineDetailSkeleton |
| `src/app/catalogo/page.tsx` | Substituiu "Carregando ADEGA..." por WineCardSkeleton |
| `src/app/catalogo/[id]/page.tsx` | Substituiu "Carregando detalhes..." por WineDetailSkeleton |

---

## 3. Toast de Confirmacao

### Implementacao
- **ToastProvider**: Contexto global para gerenciar notificacoes
- **useToast hook**: `showToast(mensagem, tipo)` com auto-dismiss em 3s
- **Animacao**: slide-in-from-bottom com fade-in
- **Posicao**: bottom-24 (acima da navbar)
- **Z-index**: 600 (acima do cart overlay e modal)

### Arquivos
| Arquivo | Mudanca |
|---------|----------|
| `src/context/ToastContext.tsx` | Novo - ToastProvider e useToast |
| `src/app/layout.tsx` | Envolvido com ToastProvider |
| `src/app/catalogo/page.tsx` | Toast ao adicionar ao carrinho |
| `src/app/catalogo/[id]/page.tsx` | Toast ao adicionar ao carrinho |

---

## 4. Sistema de Favoritos

### Implementacao
- **FavoritesProvider**: Contexto com persistencia em localStorage
- **toggleFavorite(wine)**: Adiciona/remove vinho dos favoritos
- **isFavorite(id)**: Verifica se vinho esta nos favoritos
- **Pagina /favoritos**: Lista de vinhos salvos com opcoes de remover e adicionar ao carrinho
- **Navbar**: Aba "Favoritos" adicionada
- **Botoes de favorito**: Nos cards do catalogo e na pagina de detalhes

### Arquivos
| Arquivo | Mudanca |
|---------|----------|
| `src/context/FavoritesContext.tsx` | Novo - FavoritesProvider e useFavorites |
| `src/app/favoritos/page.tsx` | Novo - Pagina de favoritos |
| `src/app/layout.tsx` | Envolvido com FavoritesProvider |
| `src/app/catalogo/page.tsx` | Botao de favorito nos cards |
| `src/app/catalogo/[id]/page.tsx` | Botao de favorito ao lado do adicionar ao carrinho |
| `src/components/layout/Navbar.tsx` | Aba Favoritos adicionada |

---

## 5. Deploy

### Configuracao
- **Repositorio**: https://github.com/sartidigital-lab/AllvinoApp
- **Plataforma**: Vercel
- **Branch**: master
- **Deploy automatico**: Sim (push para master)

### Variaveis de Ambiente (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅

### Commits Realizados
1. `feat: implement design system with reusable UI components`
2. `feat: add skeleton loading for catalog and product detail pages`
3. `feat: add toast notification when adding item to cart`
4. `feat: add favorites system with localStorage persistence`

---

## 6. Proximas Etapas (Prioridade)

### Alta Prioridade (Impacto Direto nas Vendas)
| # | Melhoria | Descricao | Esforco |
|---|----------|-----------|---------|
| 1 | **Shimmer Skeleton** | Keyframes customizados para animacao mais suave | Baixo |
| 2 | **loading.tsx** | Skeleton automatico durante navegacao entre rotas | Baixo |
| 3 | **Vistos Recentemente** | Historico de navegacao para reencontrar vinhos | Medio |
| 4 | **Pull-to-Refresh** | Atualizar catalogo puxando para baixo no mobile | Medio |
| 5 | **Compartilhamento** | Botao para compartilhar vinho no WhatsApp | Baixo |

### Media Prioridade (Engajamento)
| # | Melhoria | Descricao | Esforco |
|---|----------|-----------|---------|
| 6 | **Avaliacoes** | Sistema de estrelas nos vinhos | Alto |
| 7 | **Comparacao** | Selecionar 2-3 vinhos e comparar lado a lado | Alto |
| 8 | **Notificacao Estoque** | Alerta quando vinho favorito esta com poucas unidades | Medio |
| 9 | **Quiz Recomendacao** | Perguntar preferencias e recomendar vinhos | Alto |
| 10 | **Modo Escuro** | Tema escuro para leitura noturna | Medio |

### Baixa Prioridade (Experiencia Premium)
| # | Melhoria | Descricao | Esforco |
|---|----------|-----------|---------|
| 11 | **Onboarding** | Tour inicial para novos usuarios | Alto |
| 12 | **Animacoes Framer Motion** | Transicoes suaves entre paginas | Medio |
| 13 | **Empty States Aprimorados** | Ilustracoes com CTAs para estados vazios | Baixo |
| 14 | **Testes Unitarios** | Jest/Vitest para componentes UI | Medio |
| 15 | **Storybook** | Documentacao visual dos componentes | Alto |

---

## 7. Stack Tecnico

| Componente | Tecnologia |
|------------|------------|
| Framework | Next.js (App Router) |
| Estilo | Tailwind CSS v4 |
| Backend | Supabase |
| Deploy | Vercel |
| Icones | Material Symbols Outlined |
| Fontes | Manrope (sans), Noto Serif (serif) |
| PWA | Manifest v4 |

---

## 8. Notas Tecnicas

### Padroes Seguidos
- Componentes com `forwardRef` para ref forwarding
- Barrel exports para imports limpos
- CSS variables para tokens de design
- Context API para estado global (Cart, Toast, Favorites)
- Persistencia em localStorage para dados do usuario
- Offline-first com IndexedDB para cached data

### Aprendizados
- Heredoc do bash pode truncar arquivos JSX complexos
- Python script para modificacoes e fragil - prefira reescrever arquivos
- Variaveis de ambiente no Vercel precisam estar configuradas em todos os ambientes (preview + production)
- O Wine type NAO tem campo `country`, apenas `region`
