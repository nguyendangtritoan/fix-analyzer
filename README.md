# Senior FIX Analyzer

## 1. Project Overview

**FIX Analyzer** is a robust, client-side web application designed to parse, visualize, and compare Financial Information eXchange (FIX) messages.

Unlike simple regex parsers, this tool is architected to handle the messy reality of financial logs. It polymorphically detects various formats (Raw SOH, Pipe-delimited, Columnar logs, Bracketed debug strings, and Caret notation) and normalizes them into a structured format for analysis.

### Key Capabilities

* **Polymorphic Parsing:** Auto-detects and parses inconsistent log formats without user configuration.
* **Semantic Diffing:** Compares two FIX messages side-by-side, intelligently aligning repeating groups (e.g., `NoPartyIDs`) to highlight actual data discrepancies.
* **Dynamic Dictionary:** Ships with standard specifications for **FIX 4.0 - 4.4**, but supports runtime injection of custom QuickFIX XML dictionaries (e.g., `FIX50.xml`) to override tags and enums.
* **Format Interoperability:** Instantly converts parsed messages between specific formats (JSON, Raw SOH, Columnar) for debugging in other tools.

---

## 2. Architecture & Design Patterns

The application follows a **Functional, Component-Based Architecture** using React. It strictly separates **Data Definition**, **Pure Logic**, and **UI Presentation**.

### Core Design Principles

1.  **Client-Side Privacy:** All parsing happens in the browser memory. No data is ever sent to a server, ensuring compliance with financial data privacy rules.
2.  **Heuristic Parsing:** Instead of strict validation, the parser uses "best-effort" heuristics to extract usable data even from malformed or partial log lines.
3.  **Separation of Concerns:**
    * `constants/`: Static truth (Tag numbers, Enum definitions).
    * `utils/`: Pure functions for parsing and formatting. **Zero UI dependencies.**
    * `components/`: UI layer. `features/` contain business-aware components; `ui/` contains dumb presentational atoms.

---

## 3. Project Structure

This map guides you to the relevant logic quickly.

```text
src/
├── constants/
│   └── fixData.js          # DEFAULT_TAGS and DEFAULT_ENUMS. The fallback dictionary.
│
├── utils/
│   ├── parsers.js          # CRITICAL. Contains `parseFixMessage` (heuristics) & `parseQuickFixXml`.
│   └── fixUtils.js         # Formatting helpers (Tag lookups, clipboard logic).
│
├── components/
│   ├── features/
│   │   ├── DiffView.jsx           # Complex logic for aligning and coloring side-by-side messages.
│   │   ├── SingleView.jsx         # Simple table rendering for a single message.
│   │   ├── DictionaryControls.jsx # Manages FIX version selection and custom XML uploads.
│   │   └── CopyDropdown.jsx       # Logic for re-serializing data into different formats.
│   │
│   └── ui/
│       ├── TagBadge.jsx    # Visual atom for the Tag ID.
│       └── EmptyState.jsx  # Placeholder UI.
│
└── App.jsx                 # Orchestrator. Manages global state (inputs, dictionary) and layout.

```

---

## 4. Critical Logic Deep Dive

### A. The Polymorphic Parser (`utils/parsers.js`)

The `parseFixMessage` function is the engine of the app. It does not blindly split strings. It applies three heuristics in order:

1. **Bracketed Detection:** Checks for patterns like `<35>`. Useful for proprietary engine logs.
2. **Columnar Detection:** Checks for "Name Tag Value" patterns common in human-readable log files.
3. **Delimiter Detection:** Falls back to standard SOH (`\x01`), Pipe (`|`), or Caret (`^A`) delimiters. It handles edge cases where SOH characters are lost during copy-paste or represented as visual control characters.

> **Modification Point:** If you encounter a new log format that isn't parsing, add a new RegEx heuristic at the top of this function.

### B. The Diff Algorithm (`components/features/DiffView.jsx`)

Standard diff tools fail on FIX messages because FIX is order-dependent but often contains unordered fields outside of repeating groups.

* **Strategy:** The app creates a "Superset" of all tags found in both messages.
* **Sorting:** It sorts tags semantically: Headers first (8, 9, 35, 49, 56), body numerically, and Trailers last (10).
* **Repeating Groups:** It handles arrays of values for a single tag. It compares index-to-index (e.g., `PartyID[0]` vs `PartyID[0]`).
* **Visuals:**
* 🟡 **Yellow:** Modification (Value A != Value B).
* 🔴 **Red:** Deletion (Present in A, missing in B).
* 🟢 **Green/Normal:** Addition (Missing in A, present in B - usually implies the second message has new data).



### C. Dictionary Injection (`parseQuickFixXml`)

The app allows users to upload a QuickFIX-style XML.

* **Logic:** It parses DOM elements `<field number="..." name="...">` and nested `<value enum="..." description="...">`.
* **State:** The `App.jsx` state tags and enums are updated. All child components read from these props, ensuring instant UI updates upon file load.

---

## 5. Development Guide

### Prerequisites

* Node.js v20+ (Consistent with CI environment)
* npm

### Setup

This project uses **Vite** for fast HMR and building.

```bash
npm install
npm run dev

```

### Linting

Ensure code quality before committing:

```bash
npm run lint

```

### Styling

We use **Tailwind CSS** with **Lucide React** icons.

* **Theme:** Colors are chosen to mimic professional financial terminals (Slate/Gray backgrounds, Monospace fonts for values, high-contrast Red/Green/Yellow for diffs).
* **Responsiveness:** The layout shifts from Single Column (Mobile) to Two-Pane (Desktop) automatically.

### Adding a New Export Format

To add a format (e.g., CSV):

1. Go to `utils/fixUtils.js` -> `generateOutput`.
2. Add a new case `'csv': ... logic`.
3. Go to `components/features/CopyDropdown.jsx` and add the option to the `options` array.

---

## 6. Deployment

The project is configured for automated deployment to **GitHub Pages** via GitHub Actions.

* **Workflow:** `.github/workflows/deploy.yml`
* **Trigger:** Pushes to the `master` branch.
* **Process:**
1. Checks out code.
2. Sets up Node v20.
3. Builds the project (`npm run build`) to the `dist/` folder.
4. Uploads and deploys the artifact to GitHub Pages.

## 7. Future Roadmap / Known Limitations