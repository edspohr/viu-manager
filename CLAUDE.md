# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test framework is configured.

## Architecture

**VIU Manager** is a single-page React app for managing large-format print orders at VIU. There is no backend — all data lives in Zustand state persisted to localStorage.

### Core Tech
- React 19 + TypeScript (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- Zustand 5 for state (`src/store/useStore.ts`) with localStorage persistence and versioned migration
- Tailwind CSS 3 with `darkMode: "class"` and zinc color palette
- `@dnd-kit` for kanban drag-and-drop
- Google Generative AI (`@google/generative-ai`) — requires `VITE_GEMINI_API_KEY` env var
- Framer Motion for animations
- Sonner for toast notifications

### App Structure

There is no router. The app is a single kanban board (`KanbanBoard`) with role-based access control and modal-driven workflows.

**Entry flow:** `main.tsx` → `App.tsx` → `KanbanBoard` + modals

**Navigation** is modal-based:
- `DevLoginModal` — role switcher (appears on load and via header button)
- `AICotizadorModal` — AI-powered quote generator (admin/superadmin only), supports file uploads (PDF/JPG/PNG) passed to Gemini
- `PricingConfigModal` — pricing config (superadmin only)
- Inline order detail overlay inside `KanbanBoard`

### State (`src/store/useStore.ts`)

The Zustand store holds all app data:
- `currentUser` — role (`admin | client | operations | superadmin`) and userId
- `orders`, `customers`, `materials`, `pricingConfig`
- Key actions: `switchUser`, `addOrder`, `updateOrderStatus`, `updateFileStatus`, `updatePricingConfig`, `resetStore`

State is versioned (currently v2). If store shape changes, increment the version and add a migration case to prevent crashes on load from stale persisted state.

### Order Workflow

Orders move through 5 kanban columns: `Solicitud → Arte → Producción → Despacho → Terminado`

Orders have a `fileStatus` field with values `Rojo | Amarillo | Verde` indicating file readiness.

### Styling Conventions

Utility function `cn()` in `src/lib/utils.ts` combines `clsx` + `tailwind-merge` — use it for conditional class merging. Role-based UI visibility is determined at render time from `currentUser.role`.
