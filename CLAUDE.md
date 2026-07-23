# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run test       # Run Vitest suite (quoteEngine + structuredExtractor)
npm run preview    # Preview production build
```

## Architecture

**VIU Manager** is a single-page React app for managing large-format print quotations at VIU Print. Firebase Auth handles sign-in; **Firestore is the source of truth** for all shared data (orders, materials, customers, pricing config). Zustand + localStorage remain only as a local cache for optimistic UI and offline fallback.

### Core tech
- React 19 + TypeScript (strict, `noUnusedLocals`, `noUnusedParameters`)
- Firebase 12 (Auth + Firestore with `persistentLocalCache` + multi-tab manager)
- Zustand 5 (`src/store/useStore.ts`) — cache only, never the source of truth for shared data
- Tailwind CSS 3 with zinc palette
- `@google/generative-ai` — Gemini for AI quote extraction (`VITE_GEMINI_API_KEY`)
- Framer Motion, Sonner, Recharts, `pdfjs-dist`, `xlsx`, `@dnd-kit`

### App structure
No router. Entry: `main.tsx` → `App.tsx` → `AppShell` + view routing.

Views: `quotations` (list + detail overlay) and `settings` (superadmin only). The public `?order=<id>` URL renders `ApprovalPage` standalone for client sign-off.

### Auth (`src/lib/useAuth.ts`)
Firebase Auth (Google OAuth + email/password). On first sign-in, `ensureUserDoc` creates `users/{uid}` with role `pending` (except the initial superadmin email). A real-time `onSnapshot` on the user doc drives live role changes. `App.tsx` gates the UI: pending users see `PendingScreen`, `admin`/`superadmin` see the app.

### Firestore sync layer

**`src/lib/firestoreSync.ts`** — write helpers with one retry + toast on failure. Every store mutation on shared data (add/update/delete order, material, customer, pricing config) writes through here after the optimistic local update.

**`src/lib/firestoreListeners.ts`** — `subscribeToSharedData()` attaches `onSnapshot` to `materials`, `customers`, `orders`, and `config/pricing`. Each snapshot replaces the corresponding store slice via `replaceOrders` / `replaceMaterials` / `replaceCustomers` / `replacePricingConfig`. Also drives the `syncStatus` slice (`connecting` → `live` / `offline` / `error`). Lifecycle managed in `App.tsx` — subscribes once the user has a staff role, unsubscribes on sign-out.

**`src/lib/firestoreMigration.ts`** — `runFirstLoginMigration()` runs once per device (guarded by `viu-firestore-migrated:v1` in localStorage). Uploads any locally-cached materials / customers / orders / pricingConfig that Firestore doesn't yet have. Uses merge keys (SKU for materials, RUT for customers) so multiple users converge on a shared superset without duplicates. Skips any record whose id matches the shipped seed catalog (`src/data/mockData.ts` customers + `src/data/dipisaMaterials.ts`) *unless the user has modified it* — this keeps demo data out of production.

### Firestore data model
- `users/{uid}` — `{uid, email, displayName, photoURL, role: 'admin' | 'superadmin' | 'pending'}`
- `orders/{orderId}` — full `Order` document
- `materials/{materialId}` — full `Material` document (doc id = `material.id`)
- `customers/{customerId}` — full `Customer` document (doc id = `customer.id`)
- `config/pricing` — singleton holding the entire `PricingConfig` (segment multipliers, labor rates, finishing pricing, company data used in the PDF)

### State (`src/store/useStore.ts`)
The store now also tracks:
- `syncStatus: 'connecting' | 'live' | 'offline' | 'error'` — surfaced by `SyncBadge`
- `hasHydratedFromFirestore: boolean` — flips true once the first snapshot round-trip completes. UI uses this to show skeletons instead of stale local-cache data.
- `replaceOrders / replaceCustomers / replaceMaterials / replacePricingConfig` — called only by the listener layer.
- `clearLocalCache()` — wipes local slices; snapshots repopulate. **There is no `resetStore` anymore** — a production device must never silently repopulate mock data.

Persist version is `11`. On version bump, the migrate function wipes local state (Firestore will rehydrate). Only bump when the persisted shape changes; snapshot-driven fields don't need a bump.

### Rules (`firestore.rules`)
`isStaff()` helper: authenticated + `users/{uid}.role in ['admin','superadmin']`. Pending users cannot read or write shared collections.
- `orders`: `get` public (approval link), `list`/`create`/`delete`/staff-update require `isStaff()`, unauthenticated update only via `isClientApprovalUpdate()` (strict: only signature/status fields, only Enviada→Aceptada transition).
- `materials`, `customers`, `config/**`: staff-only read + write.
- `users`: user reads own doc, superadmin reads/updates any.

### Order workflow (statuses)
`Borrador → Pendiente Aprobación → Aprobada Internamente → Enviada al Cliente → (Aceptada | Rechazada)`

`ApprovalPage` (public) reads a single order via `getOrderFromFirestore`, lets the client sign, and calls `syncOrderToFirestore` — the write is validated by `isClientApprovalUpdate()`.

### Connection UX
`SyncBadge` (in `AppShell` header) shows green (Sincronizado) / amber (Sin conexión — cambios pendientes) / red (Error de sincronización). Amber trigger = `!navigator.onLine` OR listener error. Firestore's persistent cache queues writes offline and flushes on reconnect.

Skeleton states on quotation list, materials, and customers use `hasHydratedFromFirestore` — never show mock data before the first snapshot lands.

### Styling
`cn()` in `src/lib/utils.ts` = `clsx` + `tailwind-merge`. Role-based UI gated at render time on `auth.user.role`.

### Tests
`vitest` runs `src/lib/quoteEngine.test.ts` and `src/lib/structuredExtractor.test.ts`. No component or integration tests.
