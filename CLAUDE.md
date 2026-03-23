# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**First-time setup:**
```bash
npm run setup   # installs deps, generates Prisma client, runs DB migrations
```

**Development (Windows):**
The `npm run dev` scripts use Unix-style `NODE_OPTIONS='...'` syntax which does not work in cmd.exe or PowerShell. Use one of:
- Run from **Git Bash**: `npm run dev`
- Or configure npm to use Git Bash: `npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`, then `npm run dev`

**Other scripts:**
```bash
npm run build        # production build
npm run lint         # ESLint
npm test             # run all Vitest tests
npx vitest run src/path/to/file.test.tsx   # run a single test file
npx prisma studio    # browse the SQLite database
npm run db:reset     # reset and re-migrate the database
```

**Why `node-compat.cjs` is required:** Node 25+ exposes `localStorage`/`sessionStorage` globals that break SSR. The file removes them on the server side.

## Architecture

This is an AI-powered React component generator. Users describe a component in a chat, Claude generates the code, and a live preview renders the result — all without writing files to disk.

### Virtual File System

The core concept is a **in-memory virtual file system** (`src/lib/file-system.ts` — `VirtualFileSystem` class). Generated files exist only in memory and are passed between client and server as serialized JSON. The file system is stored in `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) so all UI components share the same state.

### AI Generation Flow

1. **Client** (`ChatInterface.tsx`) sends messages + the serialized virtual FS to `POST /api/chat`.
2. **API route** (`src/app/api/chat/route.ts`) reconstructs the `VirtualFileSystem` from the payload, then calls Claude via the Vercel AI SDK (`streamText`) with two tools:
   - `str_replace_editor` — view/create/edit files in the virtual FS (like the Claude text editor tool)
   - `file_manager` — rename/delete/list files
3. Claude streams back tool calls that mutate the virtual FS. On finish, the updated FS and messages are saved to the database (authenticated users only).
4. **Client** receives the stream, updates the `FileSystemContext`, and the `PreviewFrame` re-renders.

### Live Preview

`PreviewFrame.tsx` renders an `<iframe>` with a fully self-contained HTML document. The pipeline:
1. All virtual FS files are Babel-transpiled (JSX/TSX → JS) client-side via `@babel/standalone`.
2. Each transpiled file becomes a Blob URL.
3. An [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) is injected into the iframe's `<head>` mapping import specifiers to Blob URLs.
4. Third-party packages not in the virtual FS are resolved automatically via `https://esm.sh/`.
5. Tailwind CSS is loaded from CDN inside the iframe, so generated components can use Tailwind classes freely.

Entry point resolution order: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx` → `/src/App.tsx` → first `.jsx`/`.tsx` file found.

### AI Provider

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is set it returns a real Claude model (`claude-haiku-4-5`). Without a key it falls back to `MockLanguageModel`, a hardcoded generator that produces counter/form/card components — useful for development without an API key.

### Auth & Persistence

- Auth is JWT-based (no NextAuth). Sessions are stored in an `httpOnly` cookie. `src/lib/auth.ts` handles signing/verifying. `src/middleware.ts` protects `/api/projects` and `/api/filesystem`.
- Database: SQLite via Prisma. The database schema is defined in `prisma/schema.prisma` — always reference it when you need to understand the structure of data stored in the database. The Prisma client is generated into `src/generated/prisma`.
- Anonymous users can use the app but projects are not persisted.

### Key Data Flow Detail

The virtual FS is serialized as `Record<string, FileNode>` (with `Map` children stripped) for JSON transport. The API route calls `fileSystem.deserializeFromNodes(files)` to rebuild the tree before passing it to the AI tools. After generation, `fileSystem.serialize()` is saved to `Project.data`.
