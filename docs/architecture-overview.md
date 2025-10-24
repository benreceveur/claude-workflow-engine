# Architecture Overview

This document summarizes the workflow engine design for quick familiarization.

## Runtime Layout
- `install.sh` deploys the engine to `~/.workflow-engine/` and symlinks `~/.claude`.
- The shell bootstrap (`auto-behavior-hook.sh`) sources:
  - `auto-behavior-system.js` for skill/agent routing.
  - `enhanced-memory-manager.js` for contextual memory retrieval.
  - `skill-executor.js` for deterministic skill execution.
- Memory files live under `~/.workflow-engine/memory/`, segmented per repository via `repo-detector.js`.
- Skills are structured in `skills/<name>/`, each with `SKILL.md` (spec) and `scripts/main.py` (implementation).

## Request Flow
```
User Input → Auto Behavior System
  ├─ SkillRouter (keyword intent + manifest)
  │   └─ SkillExecutor (procedural tasks)
  └─ EnhancedAgentDispatcher (agent recommendation)
        └─ AgentLearningSystem (dispatch logging)
```

## Data Storage
- JSON memories (global + per-repo) augmented by the persistent vector index stored under `~/.workflow-engine/index/`.
- Logs captured in `~/.workflow-engine/logs/`.

## Key Modules
| Module | Responsibility |
|--------|----------------|
| `skill-executor.js` | Validates and executes skills with sandbox controls and caching. |
| `enhanced-memory-manager.js` | Merges global + repo memory, feeds vector search. |
| `auto-behavior-system.js` | Enforces behavior rules, decides skill vs agent vs hybrid. |
| `enhanced-agent-dispatcher.js` | Scores agents, applies repository/context boosts. |
| `persistent-index.js` | Node façade for the Python embedding/index pipeline. |

## Deployment Artifacts
- `/install.sh` – core installer, invoked by `download/install.sh` or the `.command` launcher.
- `scripts/memory-index.py` – Python service for persistent embeddings.
- `download/` – shareable installers for end users.

