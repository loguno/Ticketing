# Restructuring Plan: Move Project Files to Ticket Folder

This plan defines the process for moving all project source code, configurations, and documentation files into the existing `Ticket` directory, leaving environment configs (`.git`, `.agents`) and workspace files in the root.

## Project Type
- **WEB** (Next.js, Prisma, Docker)

## Success Criteria
1. All files except `.git`, `.agents`, `node_modules`, and this plan file (`move-to-ticket.md`) are successfully relocated to the `Ticket/` directory.
2. Git tracking is preserved for all moved files.
3. The project can be successfully built (`npm run build`) and run (`npm run dev`) from within the `Ticket` directory.
4. Prisma client can be generated (`npx prisma generate`) successfully from within the `Ticket` directory.

## Tech Stack
- Framework: Next.js (React)
- ORM: Prisma
- Containerization: Docker (Dockerfile & docker-compose.yml)
- CSS: Tailwind CSS (v4)

## File Structure after Restructuring
```plaintext
. (root)
├── .git/
├── .agents/
├── move-to-ticket.md
└── Ticket/
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── AGENTS.md
    ├── CLAUDE.md
    ├── Dockerfile
    ├── README.md
    ├── architettura-base.md
    ├── docker-compose.yml
    ├── eslint.config.mjs
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── portale_ticket_aziendali.md
    ├── postcss.config.mjs
    ├── prisma/
    │   ├── dev.db
    │   ├── schema.prisma
    │   └── seed.ts
    ├── public/
    ├── src/
    └── tsconfig.json
```

## Task Breakdown

### Task 1: File Relocation
- **Agent**: `devops-engineer`
- **Skills**: `powershell-windows`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: Current directory layout
- **OUTPUT**: Files relocated into the `Ticket` directory
- **VERIFY**:
  - `Ticket` contains `src`, `prisma`, `public`, and all config files.
  - Root directory only contains `.git`, `.agents`, `Ticket`, and `move-to-ticket.md`.

### Task 2: Environment Setup & Verify Build
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: Relocated project inside `Ticket`
- **OUTPUT**: Next.js build output, generated Prisma client
- **VERIFY**:
  - Run `npx prisma generate` inside `Ticket` and verify success.
  - Run `npm run build` inside `Ticket` and verify success.

---

## Phase X: Final Verification

### 1. Build Verification
```bash
# Navigate to Ticket directory
cd Ticket

# Generate prisma client
npx prisma generate

# Build Next.js app
npm run build
```

### 2. Rule Compliance (Manual Check)
- [ ] Root contains only Git config, Agents config, and the `Ticket` folder.
- [ ] No code compilation warnings/errors inside `Ticket`.
