# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, Prisma generate, run migrations
npm run dev          # Dev server with Turbopack (recommended)
npm run dev:daemon   # Dev server in background, logs to logs.txt
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run db:reset     # Force-reset SQLite database
```

A `ANTHROPIC_API_KEY` in `.env` is optional — without it the app uses a built-in mock provider that generates sample components.

## Architecture

UIGen is a Next.js 15 (App Router) application where users describe React components in chat and Claude generates code in real time. All generated files live in an **in-memory virtual file system** — nothing is written to disk. Authenticated users get their project state persisted to a SQLite database via Prisma.

### Request / data flow

1. User sends a chat message → `ChatInterface` → POST `/api/chat`
2. `api/chat/route.ts` calls Claude via Vercel AI SDK, streaming the response
3. Claude uses two tools to manipulate the virtual FS:
   - **`str_replace_editor`** (`src/lib/tools/str-replace.ts`) — create files, str_replace, insert lines
   - **`file_manager`** (`src/lib/tools/file-manager.ts`) — rename / delete files
4. Tool calls are executed inside `FileSystemContext` (in-memory, no I/O)
5. `PreviewFrame` transforms updated files with Babel (in-browser JSX) and renders them in a sandboxed iframe using an `esm.sh` import map
6. For authenticated users, project state (messages + serialized FS) is saved to the DB after each turn

### Key files

| File | Role |
|------|------|
| `src/app/main-content.tsx` | Three-panel shell: chat (35%) + preview/code editor (65%) |
| `src/app/api/chat/route.ts` | Streaming chat endpoint; wires tools to Claude |
| `src/lib/file-system.ts` | `VirtualFileSystem` class — all generated files live here |
| `src/lib/contexts/file-system-context.tsx` | React context; executes tool calls, manages selected file |
| `src/lib/contexts/chat-context.tsx` | Wraps Vercel AI SDK `useChat`; tracks anonymous sessions |
| `src/lib/provider.ts` | `getLanguageModel()` — returns Claude Haiku 4.5 or `MockLanguageModel` |
| `src/lib/transform/jsx-transformer.ts` | Babel standalone JSX → blob URLs; builds `esm.sh` import maps |
| `src/lib/prompts/generation.tsx` | System prompt for Claude (component style rules, file conventions) |
| `src/lib/auth.ts` | JWT session management (Jose, HttpOnly cookies, 7-day TTL) |
| `src/actions/` | Next.js server actions for project CRUD |

### Routing

- `/` — root page; redirects authenticated users to their most recent project, otherwise renders the main UI
- `/[projectId]` — loads a saved project from the DB and hydrates the FS + chat history
- `/api/chat` — streaming POST endpoint

### Component layout (`src/components/`)

- `chat/` — `ChatInterface`, `MessageList`, `MessageInput`, `MarkdownRenderer`
- `editor/` — `FileTree`, `CodeEditor` (Monaco wrapper)
- `preview/` — `PreviewFrame` (sandboxed iframe with Babel transform)
- `auth/` — `AuthDialog`, `SignInForm`, `SignUpForm`
- `ui/` — shadcn/ui primitives (Radix UI based)

### Database

Prisma + SQLite (`prisma/dev.db`). Two models:

- **User** — email, bcrypt password
- **Project** — name, optional `userId`, `messages` (JSON string), `data` (JSON string for serialized FS)

After schema changes run `npx prisma migrate dev`.

### Styling

Tailwind CSS v4 with PostCSS. shadcn/ui components use the "new-york" style. Path alias `@/*` resolves to `src/*`.

### Testing

Vitest + React Testing Library + jsdom. Tests live in `__tests__/` subdirectories next to their components. Run a single test file: `npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx`.
