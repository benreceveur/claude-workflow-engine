#!/usr/bin/env python3
"""
Dependency Guardian Skill - Main Entry Point
Manages dependencies with security scanning and intelligent updates
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

# Default operation
operation = context.get('operation', 'scan')
project_dir = context.get('project_dir', '.')

# Package manager detection patterns
PACKAGE_MANAGERS = {
    'npm': {
        'manifest': 'package.json',
        'lockfile': 'package-lock.json',
        'scan_cmd': ['npm', 'audit', '--json'],
        'update_cmd': ['npm', 'update'],
        'outdated_cmd': ['npm', 'outdated', '--json']
    },
    'yarn': {
        'manifest': 'package.json',
        'lockfile': 'yarn.lock',
        'scan_cmd': ['yarn', 'audit', '--json'],
        'update_cmd': ['yarn', 'upgrade'],
        'outdated_cmd': ['yarn', 'outdated', '--json']
    },
    'pip': {
        'manifest': 'requirements.txt',
        'lockfile': 'requirements.txt',
        'scan_cmd': ['pip-audit', '--format=json'],
        'update_cmd': ['pip', 'install', '--upgrade'],
        'outdated_cmd': ['pip', 'list', '--outdated', '--format=json']
    },
    'poetry': {
        'manifest': 'pyproject.toml',
        'lockfile': 'poetry.lock',
        'scan_cmd': ['poetry', 'audit', '--json'],
        'update_cmd': ['poetry', 'update'],
        'outdated_cmd': ['poetry', 'show', '--outdated', '--format=json']
    },
    'cargo': {
        'manifest': 'Cargo.toml',
        'lockfile': 'Cargo.lock',
        'scan_cmd': ['cargo', 'audit', '--json'],
        'update_cmd': ['cargo', 'update'],
        'outdated_cmd': ['cargo', 'outdated', '--format=json']
    },
    'go': {
        'manifest': 'go.mod',
        'lockfile': 'go.sum',
        'scan_cmd': ['go', 'list', '-m', '-json', 'all'],
        'update_cmd': ['go', 'get', '-u'],
        'outdated_cmd': ['go', 'list', '-u', '-m', '-json', 'all']
    }
}

def detect_package_manager(project_path: str) -> Optional[str]:
    """Detect which package manager is used"""
    path = Path(project_path)

    for pm_name, pm_config in PACKAGE_MANAGERS.items():
        manifest_file = path / pm_config['manifest']
        if manifest_file.exists():
            return pm_name

    return None

def run_command(cmd: List[str], cwd: str = '.') -> Tuple[bool, str, str]:
    """Run command and return (success, stdout, stderr)"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=60
        )
        return (result.returncode == 0, result.stdout, result.stderr)
    except subprocess.TimeoutExpired:
        return (False, '', 'Command timed out')
    except FileNotFoundError:
        return (False, '', f'Command not found: {cmd[0]}')
    except Exception as e:
        return (False, '', str(e))

def parse_npm_audit(audit_output: str) -> Dict:
    """Parse npm audit JSON output"""
    try:
        data = json.loads(audit_output)

        if 'vulnerabilities' in data:
            # npm 7+ format
            vulns = data.get('vulnerabilities', {})
            parsed_vulns = []

            for pkg_name, vuln_data in vulns.items():
                parsed_vulns.append({
                    'package': pkg_name,
                    'version': vuln_data.get('range', 'unknown'),
                    'severity': vuln_data.get('severity', 'unknown'),
                    'title': vuln_data.get('via', [{}])[0].get('title', 'Unknown vulnerability') if isinstance(vuln_data.get('via'), list) else 'Unknown',
                    'cve': vuln_data.get('via', [{}])[0].get('cve', '') if isinstance(vuln_data.get('via'), list) else '',
                    'recommendation': f"Update to version {vuln_data.get('fixAvailable', {}).get('version', 'latest')}" if vuln_data.get('fixAvailable') else 'No fix available'
                })

            summary = {
                'critical': data.get('metadata', {}).get('vulnerabilities', {}).get('critical', 0),
                'high': data.get('metadata', {}).get('vulnerabilities', {}).get('high', 0),
                'medium': data.get('metadata', {}).get('vulnerabilities', {}).get('moderate', 0),
                'low': data.get('metadata', {}).get('vulnerabilities', {}).get('low', 0),
                'total': data.get('metadata', {}).get('vulnerabilities', {}).get('total', 0)
            }

            return {'vulnerabilities': parsed_vulns, 'summary': summary}
        else:
            # Older format or no vulnerabilities
            return {'vulnerabilities': [], 'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': 0}}

    except json.JSONDecodeError:
        return {'error': 'Failed to parse audit output'}
    except Exception as e:
        return {'error': str(e)}

def parse_npm_outdated(outdated_output: str) -> Dict:
    """Parse npm outdated JSON output"""
    try:
        if not outdated_output or outdated_output.strip() == '{}':
            return {'updates': {'patch': [], 'minor': [], 'major': []}, 'summary': {'total': 0, 'patch': 0, 'minor': 0, 'major': 0}}

        data = json.loads(outdated_output)
        updates = {'patch': [], 'minor': [], 'major': []}

        for pkg_name, pkg_data in data.items():
            current = pkg_data.get('current', '')
            latest = pkg_data.get('latest', '')

            if not current or not latest:
                continue

            # Determine update type
            current_parts = current.lstrip('v').split('.')
            latest_parts = latest.lstrip('v').split('.')

            update_type = 'patch'
            if len(current_parts) >= 1 and len(latest_parts) >= 1:
                if current_parts[0] != latest_parts[0]:
                    update_type = 'major'
                elif len(current_parts) >= 2 and len(latest_parts) >= 2 and current_parts[1] != latest_parts[1]:
                    update_type = 'minor'

            updates[update_type].append({
                'package': pkg_name,
                'current': current,
                'latest': latest,
                'type': update_type,
                'breaking_changes': update_type == 'major'
            })

        summary = {
            'total': sum(len(v) for v in updates.values()),
            'patch': len(updates['patch']),
            'minor': len(updates['minor']),
            'major': len(updates['major'])
        }

        return {'updates': updates, 'summary': summary}

    except json.JSONDecodeError:
        return {'error': 'Failed to parse outdated output'}
    except Exception as e:
        return {'error': str(e)}

def scan_vulnerabilities(project_path: str, pm: str) -> Dict:
    """Scan for vulnerabilities"""
    pm_config = PACKAGE_MANAGERS.get(pm)
    if not pm_config:
        return {'success': False, 'error': f'Unsupported package manager: {pm}'}

    # Run audit command
    success, stdout, stderr = run_command(pm_config['scan_cmd'], project_path)

    # npm audit returns non-zero exit code when vulnerabilities found, which is expected
    if pm == 'npm' or pm == 'yarn':
        if stdout:
            parsed = parse_npm_audit(stdout)
            if 'error' in parsed:
                return {'success': False, 'error': parsed['error']}

            return {
                'success': True,
                'project_type': pm,
                'vulnerabilities': parsed.get('vulnerabilities', []),
                'summary': parsed.get('summary', {})
            }
        else:
            # No output means no vulnerabilities or command failed
            if stderr and 'npm' in stderr.lower() and 'audit' in stderr.lower():
                return {'success': False, 'error': stderr}
            return {
                'success': True,
                'project_type': pm,
                'vulnerabilities': [],
                'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': 0}
            }

    # For other package managers (placeholder)
    return {
        'success': True,
        'project_type': pm,
        'message': f'Vulnerability scanning for {pm} would execute here',
        'vulnerabilities': [],
        'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': 0}
    }

def check_updates(project_path: str, pm: str) -> Dict:
    """Check for available updates"""
    pm_config = PACKAGE_MANAGERS.get(pm)
    if not pm_config:
        return {'success': False, 'error': f'Unsupported package manager: {pm}'}

    # Run outdated command
    success, stdout, stderr = run_command(pm_config['outdated_cmd'], project_path)

    if pm == 'npm':
        parsed = parse_npm_outdated(stdout)
        if 'error' in parsed:
            return {'success': False, 'error': parsed['error']}

        return {
            'success': True,
            'project_type': pm,
            'updates': parsed.get('updates', {}),
            'summary': parsed.get('summary', {})
        }

    # For other package managers (placeholder)
    return {
        'success': True,
        'project_type': pm,
        'message': f'Update checking for {pm} would execute here',
        'updates': {'patch': [], 'minor': [], 'major': []},
        'summary': {'total': 0, 'patch': 0, 'minor': 0, 'major': 0}
    }

def update_dependencies(project_path: str, pm: str, update_type: str, dry_run: bool) -> Dict:
    """Update dependencies"""
    if dry_run:
        return {
            'success': True,
            'dry_run': True,
            'message': f'Would update {update_type} dependencies for {pm}',
            'updates_applied': 0
        }

    pm_config = PACKAGE_MANAGERS.get(pm)
    if not pm_config:
        return {'success': False, 'error': f'Unsupported package manager: {pm}'}

    # This is a placeholder - real implementation would:
    # 1. Run update command
    # 2. Run tests
    # 3. Create PR if configured

    return {
        'success': True,
        'project_type': pm,
        'message': f'Dependency updates for {pm} would execute here',
        'updates_applied': 0,
        'tests_run': False,
        'pr_created': False
    }

def audit_dependencies(project_path: str, pm: str) -> Dict:
    """Generate dependency audit report"""
    pm_config = PACKAGE_MANAGERS.get(pm)
    if not pm_config:
        return {'success': False, 'error': f'Unsupported package manager: {pm}'}

    # Read package manifest
    manifest_path = Path(project_path) / pm_config['manifest']
    if not manifest_path.exists():
        return {'success': False, 'error': f'Manifest not found: {pm_config["manifest"]}'}

    try:
        if pm in ['npm', 'yarn']:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)

            deps = manifest.get('dependencies', {})
            dev_deps = manifest.get('devDependencies', {})

            return {
                'success': True,
                'project_type': pm,
                'dependencies': {
                    'production': len(deps),
                    'development': len(dev_deps),
                    'total': len(deps) + len(dev_deps)
                },
                'depth': {
                    'direct': len(deps) + len(dev_deps),
                    'transitive': 0,  # Would need to parse lock file
                    'max_depth': 0
                },
                'size': {
                    'total_mb': 0.0,  # Would need to calculate
                    'largest': []
                }
            }
        else:
            return {
                'success': True,
                'project_type': pm,
                'message': f'Dependency audit for {pm} would execute here'
            }

    except Exception as e:
        return {'success': False, 'error': str(e)}

def check_licenses(project_path: str, pm: str, allowed_licenses: List[str]) -> Dict:
    """Check license compliance"""
    # This is a placeholder - real implementation would:
    # 1. Extract licenses from dependencies
    # 2. Check against allowed list
    # 3. Generate report

    return {
        'success': True,
        'project_type': pm,
        'message': f'License checking for {pm} would execute here',
        'total_packages': 0,
        'licenses': {},
        'issues': []
    }

# Main dispatcher
result = {}

try:
    # Detect package manager
    pm = detect_package_manager(project_dir)

    if not pm:
        result = {
            'success': False,
            'error': 'No supported package manager detected',
            'supported': list(PACKAGE_MANAGERS.keys())
        }
    else:
        if operation == 'scan':
            # Scan for vulnerabilities
            severity_filter = context.get('severity', 'all')
            result = scan_vulnerabilities(project_dir, pm)

        elif operation == 'check-updates':
            # Check for available updates
            result = check_updates(project_dir, pm)

        elif operation == 'update':
            # Apply updates
            update_type = context.get('type', 'patch')
            dry_run = context.get('dry_run', True)
            result = update_dependencies(project_dir, pm, update_type, dry_run)

        elif operation == 'audit':
            # Generate dependency audit
            result = audit_dependencies(project_dir, pm)

        elif operation == 'licenses':
            # Check license compliance
            allowed = context.get('allowed_licenses', ['MIT', 'Apache-2.0', 'BSD-3-Clause'])
            result = check_licenses(project_dir, pm, allowed)

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
