#!/usr/bin/env python3
"""
Memory Hygiene Skill - Main Entry Point
Executes memory maintenance operations
"""

import json
import sys
import os
from pathlib import Path

# Get context from environment
context_json = os.environ.get('SKILL_CONTEXT', '{}')
context = json.loads(context_json)

# Default operation if not specified
operation = context.get('operation', 'validate')

# Memory paths
MEMORY_DIR = Path.home() / '.claude' / 'memory'
GLOBAL_MEMORY = MEMORY_DIR / 'global-memory.json'
BACKUP_DIR = MEMORY_DIR / '.backups'
ARCHIVE_DIR = MEMORY_DIR / '.archive'

# Ensure directories exist
BACKUP_DIR.mkdir(exist_ok=True)
ARCHIVE_DIR.mkdir(exist_ok=True)

def load_memory():
    """Load global memory file"""
    if not GLOBAL_MEMORY.exists():
        return {"patterns": {}, "decisions": {}, "libraries": {}, "standards": {}, "agents": {}}

    with open(GLOBAL_MEMORY, 'r') as f:
        return json.load(f)

def save_memory(memory, backup=True):
    """Save memory with optional backup"""
    if backup and GLOBAL_MEMORY.exists():
        # Create timestamped backup
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = BACKUP_DIR / f'global-memory_{timestamp}.json'
        with open(GLOBAL_MEMORY, 'r') as f:
            with open(backup_path, 'w') as b:
                b.write(f.read())

    with open(GLOBAL_MEMORY, 'w') as f:
        json.dump(memory, f, indent=2)

def validate_entry(entry):
    """Validate memory entry against schema"""
    errors = []

    # Required fields
    if 'topic' not in entry:
        errors.append("Missing required field: topic")
    elif len(entry['topic']) > 100:
        errors.append("Topic exceeds 100 characters")

    if 'scope' not in entry:
        errors.append("Missing required field: scope")
    elif entry['scope'] not in ['global', 'repository']:
        errors.append("Scope must be 'global' or 'repository'")

    if 'value' not in entry:
        errors.append("Missing required field: value")

    if 'source' not in entry:
        errors.append("Missing required field: source")
    elif entry['source'] not in ['user', 'agent', 'system']:
        errors.append("Source must be 'user', 'agent', or 'system'")

    if 'confidence' not in entry:
        errors.append("Missing required field: confidence")
    elif not isinstance(entry['confidence'], (int, float)):
        errors.append("Confidence must be a number")
    elif not (0.0 <= entry['confidence'] <= 1.0):
        errors.append("Confidence must be between 0.0 and 1.0")

    # Optional TTL validation
    if 'TTL' in entry:
        try:
            from datetime import datetime
            datetime.fromisoformat(entry['TTL'].replace('Z', '+00:00'))
        except Exception as e:
            errors.append(f"Invalid TTL format (must be ISO8601): {e}")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }

def compact_memory():
    """Remove duplicates and compact memory"""
    memory = load_memory()

    stats = {
        "entries_before": 0,
        "entries_after": 0,
        "duplicates_removed": 0,
        "bytes_before": GLOBAL_MEMORY.stat().st_size if GLOBAL_MEMORY.exists() else 0,
        "bytes_after": 0
    }

    # Count entries
    for category in memory.values():
        if isinstance(category, dict):
            stats["entries_before"] += len(category)
        elif isinstance(category, list):
            stats["entries_before"] += len(category)

    # Remove exact duplicates from lists
    for key in memory:
        if isinstance(memory[key], list):
            before = len(memory[key])
            memory[key] = list(dict.fromkeys(memory[key]))  # Remove duplicates preserving order
            stats["duplicates_removed"] += before - len(memory[key])

    # Save compacted memory
    save_memory(memory, backup=True)

    # Count after
    for category in memory.values():
        if isinstance(category, dict):
            stats["entries_after"] += len(category)
        elif isinstance(category, list):
            stats["entries_after"] += len(category)

    stats["bytes_after"] = GLOBAL_MEMORY.stat().st_size
    stats["compression_ratio"] = (1 - stats["bytes_after"] / stats["bytes_before"]) * 100 if stats["bytes_before"] > 0 else 0

    return stats

def expire_stale():
    """Remove entries past their TTL"""
    from datetime import datetime

    memory = load_memory()
    expired = []

    # Check patterns with TTL
    if 'patterns' in memory:
        for key, value in list(memory['patterns'].items()):
            if isinstance(value, dict) and 'TTL' in value:
                try:
                    ttl = datetime.fromisoformat(value['TTL'].replace('Z', '+00:00'))
                    if datetime.now(ttl.tzinfo) > ttl:
                        expired.append({'category': 'patterns', 'key': key, 'value': value})
                        del memory['patterns'][key]
                except Exception:
                    pass

    if expired:
        save_memory(memory, backup=True)

        # Archive expired entries
        archive_file = ARCHIVE_DIR / f'expired_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(archive_file, 'w') as f:
            json.dump(expired, f, indent=2)

    return {
        "expired_count": len(expired),
        "archive_path": str(archive_file) if expired else None
    }

def merge_duplicates():
    """Merge similar entries"""
    from difflib import SequenceMatcher

    memory = load_memory()
    merged_count = 0

    # Merge similar patterns (>80% similarity)
    if 'patterns' in memory:
        patterns = list(memory['patterns'].items())
        to_remove = set()

        for i, (key1, val1) in enumerate(patterns):
            if key1 in to_remove:
                continue

            for key2, val2 in patterns[i+1:]:
                if key2 in to_remove:
                    continue

                # Calculate similarity
                similarity = SequenceMatcher(None, str(val1), str(val2)).ratio()

                if similarity > 0.8:
                    # Merge: keep first, remove second
                    to_remove.add(key2)
                    merged_count += 1

        # Remove merged entries
        for key in to_remove:
            del memory['patterns'][key]

    if merged_count > 0:
        save_memory(memory, backup=True)

    return {
        "merged_count": merged_count
    }

# Main dispatcher
result = {}

try:
    if operation == 'validate':
        # Validate specific entry if provided
        if 'data' in context:
            result = validate_entry(context['data'])
        else:
            result = {"error": "No data provided for validation"}

    elif operation == 'compact':
        result = compact_memory()

    elif operation == 'expire':
        result = expire_stale()

    elif operation == 'merge':
        result = merge_duplicates()

    elif operation == 'compact_and_merge':
        compact_result = compact_memory()
        merge_result = merge_duplicates()
        result = {
            "compaction": compact_result,
            "merging": merge_result
        }

    else:
        result = {"error": f"Unknown operation: {operation}"}

    result["success"] = True
    result["operation"] = operation

except Exception as e:
    result = {
        "success": False,
        "operation": operation,
        "error": str(e)
    }

# Output result as JSON
print(json.dumps(result, indent=2))
sys.exit(0 if result.get("success", False) else 1)
