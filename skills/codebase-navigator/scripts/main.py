#!/usr/bin/env python3
import json, sys, os
from pathlib import Path

context = json.loads(os.environ.get('SKILL_CONTEXT', '{}'))
repo_path = Path(context.get('path', '.')).resolve()

# Quick codebase scan
result = {
    "success": True,
    "repository": str(repo_path),
    "entry_points": [],
    "key_files": []
}

# Find common entry points
for pattern in ['main.py', 'index.js', 'app.py', 'server.js', 'main.ts']:
    matches = list(repo_path.rglob(pattern))
    if matches:
        result["entry_points"].extend([str(m.relative_to(repo_path)) for m in matches[:3]])

# Find key documentation
for doc in ['README.md', 'CONTRIBUTING.md', 'CODEOWNERS', 'docs/']:
    if (repo_path / doc).exists():
        result["key_files"].append(doc)

print(json.dumps(result, indent=2))
