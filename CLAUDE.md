# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**mein-erstes-Projekt** is a Node.js-based project. See `README.md` for the project description.

## Repository Structure

```
mein-erstes-Projekt/
├── CLAUDE.md              # This file — guidance for Claude Code
├── HANDOVER.md            # Current handover notes / work-in-progress context
├── HANDOVER_ARCHIVE/      # Archived handover snapshots (one file per session)
├── README.md              # Project description
└── .gitignore             # Standard Node.js gitignore
```

## Working with This Repo

- Keep `HANDOVER.md` up to date at the end of every session so the next session can pick up context immediately.
- When a session ends, copy the current `HANDOVER.md` content into `HANDOVER_ARCHIVE/` with a date-stamped filename (e.g. `HANDOVER_2026-05-09.md`) before overwriting it.
- Commit all three (updated `HANDOVER.md`, archived snapshot, and any code changes) together.

## Conventions

- Language: German comments and documentation are fine; code identifiers should be in English.
- Branching: work on `main` for now; create feature branches as the project grows.
- Commit style: short imperative subject line (≤72 chars), blank line, then body if needed.
