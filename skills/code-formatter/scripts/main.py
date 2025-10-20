#!/usr/bin/env python3
"""
Code Formatter Skill - Main Entry Point
Formats code across multiple languages with linting support
"""

import json
import sys
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Get context from environment
context_json = os.environ.get('SKILL_CONTEXT', '{}')
context = json.loads(context_json)

# Default operation if not specified
operation = context.get('operation', 'format')
target = context.get('target', '.')
language = context.get('language', 'auto')
check_only = context.get('check_only', False)

# Language detection mappings
LANGUAGE_EXTENSIONS = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html'
}

LANGUAGE_FORMATTERS = {
    'javascript': ['prettier', '--write'],
    'typescript': ['prettier', '--write'],
    'python': ['black', '--quiet'],
    'go': ['gofmt', '-w'],
    'rust': ['rustfmt'],
    'json': ['prettier', '--write'],
    'yaml': ['prettier', '--write'],
    'markdown': ['prettier', '--write'],
    'css': ['prettier', '--write'],
    'scss': ['prettier', '--write'],
    'html': ['prettier', '--write']
}

LANGUAGE_LINTERS = {
    'javascript': ['eslint', '--fix'],
    'typescript': ['eslint', '--fix'],
    'python': ['isort'],
}

def detect_language(file_path: str) -> Optional[str]:
    """Detect language from file extension"""
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_EXTENSIONS.get(ext)

def check_tool_available(tool: str) -> bool:
    """Check if formatting tool is available"""
    try:
        subprocess.run([tool, '--version'],
                      capture_output=True,
                      check=False,
                      timeout=5)
        return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def format_file(file_path: str, lang: str, check_mode: bool = False) -> Dict:
    """Format a single file"""
    result = {
        'file': file_path,
        'language': lang,
        'formatted': False,
        'linted': False,
        'errors': [],
        'changes': 0
    }

    # Get formatter for language
    formatter_cmd = LANGUAGE_FORMATTERS.get(lang)
    if not formatter_cmd:
        result['errors'].append(f"No formatter configured for {lang}")
        return result

    # Check if formatter is available
    formatter_tool = formatter_cmd[0]
    if not check_tool_available(formatter_tool):
        result['errors'].append(f"{formatter_tool} not found. Install it to enable formatting.")
        return result

    # Read original file for comparison
    try:
        with open(file_path, 'r') as f:
            original_content = f.read()
    except Exception as e:
        result['errors'].append(f"Cannot read file: {e}")
        return result

    # Format file
    try:
        if check_mode:
            # Check mode: verify formatting without changes
            cmd = formatter_cmd.copy()
            if formatter_tool == 'prettier':
                cmd = ['prettier', '--check', file_path]
            elif formatter_tool == 'black':
                cmd = ['black', '--check', file_path]
            else:
                # For tools without check mode, skip
                result['formatted'] = True
                return result

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            result['formatted'] = (proc.returncode == 0)
            if proc.returncode != 0:
                result['changes'] = 1  # Needs formatting
        else:
            # Format mode: apply changes
            cmd = formatter_cmd + [file_path]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if proc.returncode == 0:
                result['formatted'] = True

                # Check if file changed
                with open(file_path, 'r') as f:
                    new_content = f.read()

                if original_content != new_content:
                    result['changes'] = len([l for l in original_content.splitlines()
                                           if l not in new_content.splitlines()])
            else:
                result['errors'].append(f"Formatter failed: {proc.stderr}")

    except subprocess.TimeoutExpired:
        result['errors'].append("Formatter timed out")
    except Exception as e:
        result['errors'].append(f"Formatting error: {e}")

    # Run linter if available
    linter_cmd = LANGUAGE_LINTERS.get(lang)
    if linter_cmd and not check_mode:
        linter_tool = linter_cmd[0]
        if check_tool_available(linter_tool):
            try:
                cmd = linter_cmd + [file_path]
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                result['linted'] = True
            except Exception as e:
                result['errors'].append(f"Linting error: {e}")

    return result

def format_directory(dir_path: str, lang: str, check_mode: bool = False) -> List[Dict]:
    """Format all files in directory"""
    results = []
    path = Path(dir_path)

    if not path.exists():
        return [{'error': f"Path does not exist: {dir_path}"}]

    # Get all files
    if path.is_file():
        files = [path]
    else:
        # Recursively find files
        extensions = [ext for ext, l in LANGUAGE_EXTENSIONS.items()
                     if lang == 'auto' or l == lang]
        files = []
        for ext in extensions:
            files.extend(path.rglob(f'*{ext}'))

    # Format each file
    for file_path in files:
        file_lang = detect_language(str(file_path))
        if not file_lang:
            continue

        if lang != 'auto' and file_lang != lang:
            continue

        result = format_file(str(file_path), file_lang, check_mode)
        results.append(result)

    return results

def list_languages() -> Dict:
    """List supported languages and their tools"""
    languages = {}

    for lang, formatter_cmd in LANGUAGE_FORMATTERS.items():
        formatter_tool = formatter_cmd[0]
        available = check_tool_available(formatter_tool)

        linter_cmd = LANGUAGE_LINTERS.get(lang)
        linter_available = False
        if linter_cmd:
            linter_available = check_tool_available(linter_cmd[0])

        languages[lang] = {
            'formatter': formatter_tool,
            'formatter_available': available,
            'linter': linter_cmd[0] if linter_cmd else None,
            'linter_available': linter_available
        }

    return languages

def generate_config(lang: str, dir_path: str = '.') -> Dict:
    """Generate configuration files for language"""
    configs_created = []

    if lang in ['javascript', 'typescript']:
        # Create .prettierrc
        prettier_config = {
            "semi": False,
            "singleQuote": True,
            "tabWidth": 2,
            "trailingComma": "es5"
        }
        prettier_path = Path(dir_path) / '.prettierrc'
        with open(prettier_path, 'w') as f:
            json.dump(prettier_config, f, indent=2)
        configs_created.append(str(prettier_path))

        # Create .eslintrc.json
        eslint_config = {
            "extends": ["eslint:recommended"],
            "env": {
                "node": True,
                "es6": True
            },
            "parserOptions": {
                "ecmaVersion": 2021
            }
        }
        eslint_path = Path(dir_path) / '.eslintrc.json'
        with open(eslint_path, 'w') as f:
            json.dump(eslint_config, f, indent=2)
        configs_created.append(str(eslint_path))

    elif lang == 'python':
        # Create pyproject.toml
        pyproject_content = """[tool.black]
line-length = 88
target-version = ['py38', 'py39', 'py310', 'py311']

[tool.isort]
profile = "black"
line_length = 88
"""
        pyproject_path = Path(dir_path) / 'pyproject.toml'
        with open(pyproject_path, 'w') as f:
            f.write(pyproject_content)
        configs_created.append(str(pyproject_path))

    elif lang == 'rust':
        # Create rustfmt.toml
        rustfmt_content = """edition = "2021"
max_width = 100
hard_tabs = false
"""
        rustfmt_path = Path(dir_path) / 'rustfmt.toml'
        with open(rustfmt_path, 'w') as f:
            f.write(rustfmt_content)
        configs_created.append(str(rustfmt_path))

    return {
        'language': lang,
        'configs_created': configs_created
    }

# Main dispatcher
result = {}

try:
    if operation == 'format':
        # Format file or directory
        results = format_directory(target, language, check_only)

        # Summarize results
        total_files = len(results)
        formatted_files = len([r for r in results if r.get('formatted')])
        linted_files = len([r for r in results if r.get('linted')])
        errors = [r for r in results if r.get('errors')]
        total_changes = sum(r.get('changes', 0) for r in results)

        # Group by language
        by_language = {}
        for r in results:
            lang = r.get('language', 'unknown')
            by_language[lang] = by_language.get(lang, 0) + 1

        result = {
            'success': True,
            'operation': 'format',
            'check_only': check_only,
            'target': target,
            'summary': {
                'total_files': total_files,
                'formatted': formatted_files,
                'linted': linted_files,
                'changes': total_changes,
                'errors': len(errors)
            },
            'by_language': by_language,
            'details': results if len(results) < 20 else results[:20]  # Limit output
        }

    elif operation == 'check':
        # Check formatting without modifying
        results = format_directory(target, language, check_mode=True)
        needs_formatting = [r for r in results if r.get('changes', 0) > 0]

        result = {
            'success': len(needs_formatting) == 0,
            'operation': 'check',
            'target': target,
            'needs_formatting': len(needs_formatting),
            'total_files': len(results),
            'files': [r['file'] for r in needs_formatting]
        }

    elif operation == 'languages':
        # List supported languages
        languages = list_languages()

        result = {
            'success': True,
            'operation': 'languages',
            'languages': languages,
            'total': len(languages),
            'available': len([l for l in languages.values() if l['formatter_available']])
        }

    elif operation == 'init':
        # Generate configuration
        config_result = generate_config(language, target)

        result = {
            'success': True,
            'operation': 'init',
            'language': language,
            'configs_created': config_result['configs_created']
        }

    else:
        result = {'error': f"Unknown operation: {operation}"}

except Exception as e:
    result = {
        'success': False,
        'operation': operation,
        'error': str(e)
    }

# Output result as JSON
print(json.dumps(result, indent=2))
sys.exit(0 if result.get('success', False) else 1)
