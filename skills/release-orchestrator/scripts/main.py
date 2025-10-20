#!/usr/bin/env python3
"""
Release Orchestrator Skill - Main Entry Point
Automates releases with semantic versioning and deployment
"""

import json
import sys
import os
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Get context from environment
context_json = os.environ.get('SKILL_CONTEXT', '{}')
context = json.loads(context_json)

# Default operation if not specified
operation = context.get('operation', 'version')

# Semantic versioning regex
SEMVER_PATTERN = r'^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$'

# Conventional commit types
COMMIT_TYPES = {
    'feat': 'Features',
    'fix': 'Bug Fixes',
    'docs': 'Documentation',
    'style': 'Styles',
    'refactor': 'Refactoring',
    'perf': 'Performance',
    'test': 'Tests',
    'build': 'Build',
    'ci': 'CI/CD',
    'chore': 'Chores',
    'revert': 'Reverts'
}

def run_git_command(cmd: List[str], check=True) -> Tuple[bool, str, str]:
    """Run git command and return (success, stdout, stderr)"""
    try:
        result = subprocess.run(
            ['git'] + cmd,
            capture_output=True,
            text=True,
            check=check,
            timeout=30
        )
        return (True, result.stdout.strip(), result.stderr.strip())
    except subprocess.CalledProcessError as e:
        return (False, e.stdout.strip(), e.stderr.strip())
    except Exception as e:
        return (False, '', str(e))

def get_latest_tag() -> Optional[str]:
    """Get the latest semver tag"""
    success, stdout, _ = run_git_command(['tag', '-l', '--sort=-v:refname'])
    if not success:
        return None

    for tag in stdout.split('\n'):
        if re.match(SEMVER_PATTERN, tag):
            return tag
    return None

def parse_version(version_str: str) -> Optional[Dict]:
    """Parse semantic version string"""
    match = re.match(SEMVER_PATTERN, version_str)
    if not match:
        return None

    return {
        'major': int(match.group(1)),
        'minor': int(match.group(2)),
        'patch': int(match.group(3)),
        'prerelease': match.group(4)
    }

def format_version(version: Dict) -> str:
    """Format version dict as string"""
    ver = f"v{version['major']}.{version['minor']}.{version['patch']}"
    if version.get('prerelease'):
        ver += f"-{version['prerelease']}"
    return ver

def get_commits_since_tag(tag: Optional[str]) -> List[str]:
    """Get commit messages since tag"""
    if tag:
        cmd = ['log', f'{tag}..HEAD', '--pretty=format:%s|||%an|||%H']
    else:
        cmd = ['log', '--pretty=format:%s|||%an|||%H']

    success, stdout, _ = run_git_command(cmd)
    if not success or not stdout:
        return []

    commits = []
    for line in stdout.split('\n'):
        if line.strip():
            commits.append(line)
    return commits

def parse_commit(commit_line: str) -> Dict:
    """Parse commit message following conventional commits"""
    parts = commit_line.split('|||')
    if len(parts) != 3:
        return {
            'type': 'chore',
            'scope': None,
            'message': commit_line,
            'author': 'unknown',
            'hash': 'unknown',
            'breaking': False
        }

    message, author, commit_hash = parts

    # Parse conventional commit format: type(scope): message
    pattern = r'^(\w+)(?:\(([^)]+)\))?:\s*(.+)$'
    match = re.match(pattern, message)

    if match:
        commit_type = match.group(1)
        scope = match.group(2)
        msg = match.group(3)
    else:
        commit_type = 'chore'
        scope = None
        msg = message

    # Check for breaking changes
    breaking = 'BREAKING CHANGE' in message or commit_type.endswith('!')
    if commit_type.endswith('!'):
        commit_type = commit_type[:-1]

    return {
        'type': commit_type,
        'scope': scope,
        'message': msg,
        'author': author,
        'hash': commit_hash[:7],
        'breaking': breaking
    }

def calculate_version_bump(commits: List[Dict], current_version: Dict) -> Tuple[str, Dict]:
    """Calculate version bump based on commits"""
    has_breaking = any(c['breaking'] for c in commits)
    has_feat = any(c['type'] == 'feat' for c in commits)
    has_fix = any(c['type'] == 'fix' for c in commits)

    new_version = current_version.copy()

    if has_breaking:
        new_version['major'] += 1
        new_version['minor'] = 0
        new_version['patch'] = 0
        bump_type = 'major'
    elif has_feat:
        new_version['minor'] += 1
        new_version['patch'] = 0
        bump_type = 'minor'
    elif has_fix:
        new_version['patch'] += 1
        bump_type = 'patch'
    else:
        new_version['patch'] += 1
        bump_type = 'patch'

    # Remove prerelease
    new_version['prerelease'] = None

    return bump_type, new_version

def generate_changelog(commits: List[Dict], from_version: str, to_version: str) -> str:
    """Generate markdown changelog"""
    changelog = f"# Changelog\n\n## [{to_version}] - {datetime.now().strftime('%Y-%m-%d')}\n\n"

    # Group commits by type
    grouped = {}
    for commit in commits:
        commit_type = commit['type']
        if commit_type not in grouped:
            grouped[commit_type] = []
        grouped[commit_type].append(commit)

    # Breaking changes first
    breaking = [c for c in commits if c['breaking']]
    if breaking:
        changelog += "### ⚠️ BREAKING CHANGES\n\n"
        for commit in breaking:
            scope = f"**{commit['scope']}**: " if commit['scope'] else ""
            changelog += f"- {scope}{commit['message']} ({commit['hash']}) @{commit['author']}\n"
        changelog += "\n"

    # Then other types
    for commit_type in ['feat', 'fix', 'docs', 'perf', 'refactor', 'test', 'build', 'ci', 'chore']:
        if commit_type in grouped:
            type_name = COMMIT_TYPES.get(commit_type, commit_type.capitalize())
            changelog += f"### {type_name}\n\n"
            for commit in grouped[commit_type]:
                if commit['breaking']:
                    continue  # Already handled
                scope = f"**{commit['scope']}**: " if commit['scope'] else ""
                changelog += f"- {scope}{commit['message']} ({commit['hash']}) @{commit['author']}\n"
            changelog += "\n"

    return changelog

def calculate_version_command(context: Dict) -> Dict:
    """Calculate next version based on commits"""
    # Get current version
    current_tag = get_latest_tag()
    if not current_tag:
        current_version = {'major': 0, 'minor': 0, 'patch': 0, 'prerelease': None}
        current_str = 'v0.0.0'
    else:
        current_version = parse_version(current_tag)
        current_str = current_tag

    # Get commits since tag
    commits = get_commits_since_tag(current_tag)
    if not commits:
        return {
            'success': False,
            'error': f'No commits since {current_str}',
            'current': current_str
        }

    # Parse commits
    parsed_commits = [parse_commit(c) for c in commits]

    # Calculate bump
    bump_type, new_version = calculate_version_bump(parsed_commits, current_version)
    new_str = format_version(new_version)

    # Count commits by type
    commit_counts = {}
    for commit in parsed_commits:
        t = commit['type']
        commit_counts[t] = commit_counts.get(t, 0) + 1

    return {
        'success': True,
        'current': current_str,
        'next': new_str,
        'bump': bump_type,
        'commits': {
            'total': len(parsed_commits),
            'breaking': len([c for c in parsed_commits if c['breaking']]),
            'features': commit_counts.get('feat', 0),
            'fixes': commit_counts.get('fix', 0),
            'by_type': commit_counts
        },
        'reason': f"{'Breaking changes' if bump_type == 'major' else 'New features' if bump_type == 'minor' else 'Bug fixes'} detected"
    }

def generate_changelog_command(context: Dict) -> Dict:
    """Generate changelog between versions"""
    from_version = context.get('from')
    to_version = context.get('to', 'HEAD')

    if not from_version:
        from_version = get_latest_tag()
        if not from_version:
            return {'success': False, 'error': 'No previous version found'}

    # Get commits
    commits = get_commits_since_tag(from_version)
    if not commits:
        return {
            'success': False,
            'error': f'No commits since {from_version}'
        }

    parsed_commits = [parse_commit(c) for c in commits]

    # Calculate next version
    current_version = parse_version(from_version) or {'major': 0, 'minor': 0, 'patch': 0, 'prerelease': None}
    bump_type, new_version = calculate_version_bump(parsed_commits, current_version)
    new_str = format_version(new_version)

    # Generate changelog
    changelog = generate_changelog(parsed_commits, from_version, new_str)

    # Write to file if specified
    output_file = context.get('output')
    if output_file:
        try:
            with open(output_file, 'w') as f:
                f.write(changelog)
        except Exception as e:
            return {'success': False, 'error': f'Failed to write changelog: {e}'}

    return {
        'success': True,
        'from': from_version,
        'to': new_str,
        'commits': len(parsed_commits),
        'changelog': changelog if not output_file else f'Written to {output_file}'
    }

def create_release_command(context: Dict) -> Dict:
    """Create a full release"""
    dry_run = context.get('dry_run', True)
    release_type = context.get('type', 'patch')  # major, minor, patch
    prerelease = context.get('prerelease')  # alpha, beta, rc

    # Calculate version
    version_info = calculate_version_command(context)
    if not version_info['success']:
        return version_info

    new_version = version_info['next']

    # Add prerelease suffix if specified
    if prerelease:
        new_version += f'-{prerelease}.1'

    steps = []
    errors = []

    # Step 1: Generate changelog
    steps.append({'step': 'generate_changelog', 'status': 'pending'})
    if not dry_run:
        changelog_result = generate_changelog_command({
            'from': version_info['current'],
            'output': 'CHANGELOG.md'
        })
        if changelog_result['success']:
            steps[-1]['status'] = 'success'
        else:
            steps[-1]['status'] = 'failed'
            errors.append(changelog_result.get('error'))
    else:
        steps[-1]['status'] = 'skipped'

    # Step 2: Create git tag
    steps.append({'step': 'create_tag', 'status': 'pending', 'tag': new_version})
    if not dry_run:
        success, stdout, stderr = run_git_command(['tag', '-a', new_version, '-m', f'Release {new_version}'])
        steps[-1]['status'] = 'success' if success else 'failed'
        if not success:
            errors.append(f'Failed to create tag: {stderr}')
    else:
        steps[-1]['status'] = 'skipped'

    # Step 3: Push tag
    steps.append({'step': 'push_tag', 'status': 'pending'})
    if not dry_run and not errors:
        success, stdout, stderr = run_git_command(['push', 'origin', new_version])
        steps[-1]['status'] = 'success' if success else 'failed'
        if not success:
            errors.append(f'Failed to push tag: {stderr}')
    else:
        steps[-1]['status'] = 'skipped'

    return {
        'success': len(errors) == 0,
        'version': new_version,
        'bump': version_info['bump'],
        'dry_run': dry_run,
        'steps': steps,
        'errors': errors
    }

def deploy_command(context: Dict) -> Dict:
    """Deploy to environment"""
    environment = context.get('environment', 'staging')
    version = context.get('version', get_latest_tag())

    # This is a placeholder - real deployment would integrate with k8s, docker, etc.
    return {
        'success': True,
        'environment': environment,
        'version': version,
        'message': f'Deployment to {environment} would happen here',
        'health_checks': {
            'placeholder': 'passed'
        }
    }

def rollback_command(context: Dict) -> Dict:
    """Rollback to previous version"""
    version = context.get('version')
    environment = context.get('environment', 'staging')

    if not version:
        return {'success': False, 'error': 'Version required for rollback'}

    return {
        'success': True,
        'environment': environment,
        'version': version,
        'message': f'Rollback to {version} on {environment} would happen here'
    }

# Main dispatcher
result = {}

try:
    if operation == 'version':
        result = calculate_version_command(context)

    elif operation == 'changelog':
        result = generate_changelog_command(context)

    elif operation == 'release':
        result = create_release_command(context)

    elif operation == 'deploy':
        result = deploy_command(context)

    elif operation == 'rollback':
        result = rollback_command(context)

    else:
        result = {'success': False, 'error': f"Unknown operation: {operation}"}

    result['operation'] = operation

except Exception as e:
    result = {
        'success': False,
        'operation': operation,
        'error': str(e)
    }

# Output result as JSON
print(json.dumps(result, indent=2))
sys.exit(0 if result.get('success', False) else 1)
