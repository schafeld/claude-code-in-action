# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components based on user descriptions, with a virtual file system and real-time preview powered by in-browser JSX transformation.

## Tech Stack

- **Next.js 15** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS v4** for styling
- **Prisma** with SQLite (custom output: `src/generated/prisma`)
- **Vercel AI SDK** with Anthropic Claude
- **Vitest** for testing with jsdom
- **Babel Standalone** for client-side JSX transformation

## Common Commands

### Setup
```bash
npm run setup              # Install deps, generate Prisma client, run migrations
```

### Development
```bash
npm run dev                # Start dev server with Turbopack
npm run dev:daemon         # Start dev server in background (logs to logs.txt)
```

### Build & Testing
```bash
npm run build              # Production build
npm test                   # Run Vitest tests
npm run lint               # Run ESLint
```

### Database
```bash
npx prisma generate        # Generate Prisma client to src/generated/prisma
npx prisma migrate dev     # Create and apply migrations
npm run db:reset           # Reset database (force)
```

### Running a Single Test
```bash
npm test -- <test-file-pattern>
# Example: npm test -- file-system.test
```

## Architecture

### Core Architectural Pattern: Virtual File System

The application centers around a **VirtualFileSystem** class that manages all generated code entirely in memory—no files are written to disk during development. This design enables:

1. **Real-time preview without disk I/O**
2. **Fast iterations** during AI-powered component generation
3. **Serialization to database** for persistence

### Key Architectural Components

#### 1. Virtual File System (`src/lib/file-system.ts`)
- **In-memory file tree** with tree structure (directories & files)
- **CRUD operations**: create, read, update, delete, rename
- **Path normalization** handles both absolute and @/ alias paths
- **Serialization/deserialization** for database persistence
- Methods: `createFile()`, `updateFile()`, `readFile()`, `deleteFile()`, `rename()`, `serialize()`, `deserializeFromNodes()`

#### 2. File System Context (`src/lib/contexts/file-system-context.tsx`)
- React Context that wraps the VirtualFileSystem
- Provides hooks (`useFileSystem()`) for component access
- Manages selected file state and UI refresh triggers
- Handles tool calls from AI to update the file system

#### 3. AI Chat Integration (`src/app/api/chat/route.ts`)
- **POST endpoint** that receives messages and file system state
- Uses Vercel AI SDK's `streamText()` for streaming responses
- Provides AI with two tools:
  - `str_replace_editor`: view, create, str_replace, insert operations
  - `file_manager`: rename and delete operations
- Reconstructs VirtualFileSystem from serialized client state
- Saves conversation and file state to database on completion

#### 4. JSX Transformation (`src/lib/transform/jsx-transformer.ts`)
- **Client-side Babel transformation** using `@babel/standalone`
- Transforms JSX/TSX → ES modules with automatic React imports
- Creates **blob URLs** for transformed modules
- Generates **import maps** that:
  - Map local files to blob URLs
  - Handle @/ alias (maps to root /)
  - Resolve third-party packages to esm.sh
  - Support both absolute and relative imports
- Collects CSS imports and injects styles
- Error handling with detailed syntax error reporting

#### 5. Preview System (`src/components/preview/PreviewFrame.tsx`)
- Sandboxed iframe that runs generated code
- Uses `createPreviewHTML()` to generate preview HTML with:
  - Import maps for module resolution
  - Inline styles from CSS files
  - Error boundaries for runtime errors
  - Tailwind CDN for styling
- Entry point is always `/App.jsx`

### Data Flow

1. **User Request** → Chat Interface
2. **AI Response** → Uses tools to manipulate VirtualFileSystem
3. **Tool Calls** → Update in-memory file structure via context
4. **File Updates** → Trigger preview refresh
5. **Preview** → Transform JSX → Create import map → Render in iframe
6. **Persistence** → Serialize file system and messages to SQLite (authenticated users only)

### Authentication & Projects

- **JWT-based auth** (`src/lib/auth.ts`) with 7-day sessions
- **Anonymous users** can use the app but data isn't persisted
- **Registered users** have projects saved to database
- Projects store: messages (conversation history) and data (serialized file system)

### AI Code Generation System

The AI receives a system prompt (`src/lib/prompts/generation.tsx`) with key rules:
- All projects must have `/App.jsx` as root component
- Use @/ alias for local imports
- Style with Tailwind CSS (no inline styles)
- No HTML files (App.jsx is the entry point)
- Keep responses brief

### Import Resolution Strategy

The system supports multiple import styles:
- **@/ alias**: `@/components/Button` → `/components/Button`
- **Absolute paths**: `/components/Button`
- **Relative paths**: `./Button` or `../components/Button`
- **Third-party packages**: Automatically resolved to `https://esm.sh/[package]`

All variations are added to the import map to ensure flexible import styles work correctly.

## Key Files

- `src/lib/file-system.ts` - Core VirtualFileSystem implementation
- `src/lib/contexts/file-system-context.tsx` - React integration for file system
- `src/lib/transform/jsx-transformer.ts` - Client-side JSX transformation and import maps
- `src/app/api/chat/route.ts` - AI chat endpoint with tool calling
- `src/lib/tools/str-replace.ts` - Text editor tool for AI
- `src/lib/tools/file-manager.ts` - File management tool for AI
- `prisma/schema.prisma` - Database schema (User, Project models)
- `src/lib/auth.ts` - JWT authentication utilities

## Testing

Tests use **Vitest** with **jsdom** environment and **@testing-library/react**:
- File system tests: `src/lib/__tests__/file-system.test.ts`
- Context tests: `src/lib/contexts/__tests__/*.test.tsx`
- Component tests: `src/components/**/__tests__/*.test.tsx`
- Transformer tests: `src/lib/transform/__tests__/jsx-transformer.test.ts`

## Environment Variables

The app can run without environment variables (uses mock responses):

```env
ANTHROPIC_API_KEY=sk-...     # Optional: Enable real Claude AI
JWT_SECRET=...                # Optional: Defaults to development key
```

Without `ANTHROPIC_API_KEY`, the AI returns static placeholder code instead of generating real components.
