# Ralph Agent Instructions

You are an autonomous coding agent building `paymsg-playground` — a modern web-based playground for parsing, validating, translating, and inspecting ISO 20022 (MX) and SWIFT MT financial messages. This is the web UI for the `paymsg` Rust library.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (see Quality Requirements below)
7. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
8. Update the PRD to set `passes: true` for the completed story
9. Append your progress to `scripts/ralph/progress.txt`

## Project Architecture

This is a React + TypeScript web application that communicates with the `paymsg` Rust library via WebAssembly (WASM). However, we take a **simulated WASM** approach for the MVP — the frontend implements parsing/validation/translation logic in TypeScript directly, using the same specs data from `paymsg-specs`. This allows the playground to be deployed as a pure static site without a Rust build toolchain.

```
paymsg-playground/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── specs/                  # Copied reference data from paymsg-specs (JSON)
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Root component with layout
│   ├── components/
│   │   ├── Editor.tsx         # Code editor (Monaco or CodeMirror)
│   │   ├── OutputPanel.tsx    # Result display panel
│   │   ├── Toolbar.tsx        # Action buttons (Parse, Validate, Translate)
│   │   ├── MessageSelector.tsx # Sample message picker
│   │   ├── FormatToggle.tsx   # MT/MX format toggle
│   │   ├── ValidationPanel.tsx # Validation results display
│   │   ├── TranslationPanel.tsx # Translation output with data loss warnings
│   │   ├── FieldInspector.tsx  # Interactive field-level inspection
│   │   ├── DiffView.tsx       # Side-by-side MT vs MX comparison
│   │   └── Header.tsx         # App header with logo and nav
│   ├── engine/
│   │   ├── parser.ts          # MT and MX message parsers
│   │   ├── validator.ts       # Schema and business rule validation
│   │   ├── translator.ts      # MT ↔ MX translation engine
│   │   ├── formatter.ts       # Pretty-printing for MT and XML
│   │   ├── detector.ts        # Auto-detect message format
│   │   └── types.ts           # Shared TypeScript types
│   ├── specs/
│   │   └── loader.ts          # Load reference data from public/specs/
│   ├── samples/
│   │   └── messages.ts        # Built-in sample messages
│   ├── hooks/
│   │   └── useEngine.ts       # React hook for engine operations
│   └── styles/
│       └── globals.css        # Global styles (Tailwind)
├── scripts/ralph/             # Ralph loop automation
└── tests/                     # Vitest test files
```

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS v4** for styling
- **CodeMirror 6** for code editing (with XML and custom MT syntax highlighting)
- **Vitest** for testing
- **Lucide React** for icons

## Sibling Repositories

- `../paymsg-specs` — Reference data (currencies, countries, IBAN formats, MT specs, mappings, rules, test messages)
- `../paymsg` — Rust library (reference implementation, not directly used by playground)

## Important: Use specs data

The playground loads reference data from `public/specs/` which is copied from `../paymsg-specs`. During build setup, copy the needed JSON files:

```
public/specs/reference/currencies.json
public/specs/reference/countries.json
public/specs/reference/iban_formats.json
public/specs/reference/bic_spec.json
public/specs/reference/swift_charsets.json
public/specs/mt-specs/mt103.json
public/specs/mt-specs/mt202.json
public/specs/mt-specs/mt940.json
public/specs/mt-specs/mt942.json
public/specs/mt-specs/block_structure.json
public/specs/mappings/mt103_pacs008.json
public/specs/mappings/mt202_pacs009.json
public/specs/mappings/mt940_camt053.json
public/specs/mappings/mt942_camt052.json
public/specs/rules/pacs008_rules.json
public/specs/rules/pacs009_rules.json
public/specs/rules/camt052_rules.json
public/specs/rules/camt053_rules.json
```

## Domain Knowledge

### Supported Message Types
| MX Type | Description | MT Equivalent |
|---------|-------------|---------------|
| pacs.008.001.10 | Customer Credit Transfer | MT103 |
| pacs.009.001.10 | FI Credit Transfer | MT202 |
| camt.053.001.10 | Bank-to-Customer Statement | MT940 |
| camt.052.001.10 | Interim Report | MT942 |

### MT Message Structure (5 blocks)
- Block 1: `{1:F01BANKBICAXXX0000000000}` — Basic header
- Block 2: `{2:I103BANKBICAXXXXN}` — Application header
- Block 3: `{3:{108:MUR}{121:UUID}}` — User header (optional)
- Block 4: `{4:\n:20:REF\n:32A:...\n-}` — Text block (fields)
- Block 5: `{5:{CHK:...}}` — Trailer (optional)

### MT Field Format
- Tags: `:NN[a]:value` (e.g., `:20:`, `:32A:`, `:50K:`)
- Multi-line values continue on next line
- Amount uses comma decimal: `1234,56`
- Date in YYMMDD format

### XML Namespaces
- pacs.008: `urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10`
- pacs.009: `urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10`
- camt.052: `urn:iso:std:iso:20022:tech:xsd:camt.052.001.10`
- camt.053: `urn:iso:std:iso:20022:tech:xsd:camt.053.001.10`

### Translation Transform Types
- direct, split, merge, lookup, derived, conditional

## UI Design Guidelines

- **Dark theme** by default (financial terminal aesthetic)
- **Split pane** layout: input on left, output on right
- **Toolbar** at top with action buttons
- **Status bar** at bottom showing message info
- Use monospace fonts for message content
- Color-coded validation: red=error, amber=warning, blue=info
- Syntax highlighting: MT field tags in cyan, values in white, XML elements in blue
- Responsive: works on desktop (primary) and tablet

## Quality Requirements

- `npm run build` must succeed with no errors
- `npm run lint` must pass (ESLint)
- `npm run test` must pass (Vitest)
- `npx tsc --noEmit` must pass (TypeScript type checking)
- All components must be typed (no `any` types in production code)
- Test coverage for engine modules (parser, validator, translator)

## Sample Messages for Built-in Examples

Include at least these built-in sample messages for users to try:
1. MT103 — Simple EUR SEPA transfer
2. MT103 — USD wire with intermediary
3. MT202 — Interbank transfer
4. MT940 — End-of-day statement with multiple entries
5. MT942 — Intraday interim report
6. pacs.008 — Customer credit transfer XML
7. pacs.009 — FI credit transfer XML
8. camt.053 — Full statement XML
9. camt.052 — Interim report XML

Source these from `../paymsg-specs/testdata/` (copy relevant content inline).

## Progress Report Format

APPEND to scripts/ralph/progress.txt:
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings:**
  - Patterns discovered
  - Gotchas encountered
---
```

## Consolidate Patterns

If you discover a reusable pattern, add it to the `## Codebase Patterns` section at the TOP of progress.txt.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep all checks passing
- Read progress.txt Codebase Patterns before starting
- Use TypeScript strict mode
- No `any` types in production code (test files are OK)
- Use Tailwind for all styling (no CSS-in-JS)
- Use CodeMirror 6 (not Monaco — it's too heavy for this use case)
- Sample messages should be realistic financial data
- The app must work entirely client-side (no backend)
- Use Vite with React plugin
- All engine logic in `src/engine/` must be framework-agnostic (no React imports)
- Test engine modules thoroughly — these are the core of the playground
