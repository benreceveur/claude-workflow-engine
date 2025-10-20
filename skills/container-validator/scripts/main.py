#!/usr/bin/env python3
"""
Container Validator Skill - Main Entry Point
Validates Dockerfiles, Kubernetes manifests, and container configurations
"""

import json
import sys
import os
import re
import yaml
from pathlib import Path
from typing import Dict, List
from datetime import datetime

class ContainerValidatorSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()

    def validate_dockerfile(self) -> Dict:
        """Validate Dockerfile"""
        dockerfile = self.context.get('file', 'Dockerfile')

        if not os.path.exists(dockerfile):
            return {'success': False, 'error': f"Dockerfile not found: {dockerfile}"}

        issues = []

        with open(dockerfile, 'r') as f:
            lines = f.readlines()
            has_user = False
            has_healthcheck = False

            for i, line in enumerate(lines):
                line_upper = line.upper().strip()

                # Check for USER directive
                if line_upper.startswith('USER'):
                    has_user = True

                # Check for HEALTHCHECK
                if line_upper.startswith('HEALTHCHECK'):
                    has_healthcheck = True

                # Check for EXPOSE with secrets
                if 'ENV' in line_upper and any(s in line.upper() for s in ['PASSWORD', 'SECRET', 'KEY', 'TOKEN']):
                    issues.append({
                        'line': i + 1,
                        'severity': 'high',
                        'type': 'exposed_secret',
                        'description': 'Potential secret in environment variable',
                        'recommendation': 'Use Docker secrets or build arguments'
                    })

                # Check for apt-get without cleanup
                if 'apt-get install' in line.lower() and 'rm -rf /var/lib/apt/lists' not in line.lower():
                    issues.append({
                        'line': i + 1,
                        'severity': 'medium',
                        'type': 'no_cleanup',
                        'description': 'apt-get install without cleanup',
                        'recommendation': 'Add: && rm -rf /var/lib/apt/lists/*'
                    })

            # Check if USER was set
            if not has_user:
                issues.append({
                    'line': len(lines),
                    'severity': 'critical',
                    'type': 'root_user',
                    'description': 'Container runs as root user',
                    'recommendation': 'Add: USER nonroot'
                })

            # Check for HEALTHCHECK
            if not has_healthcheck:
                issues.append({
                    'line': len(lines),
                    'severity': 'medium',
                    'type': 'no_healthcheck',
                    'description': 'Missing HEALTHCHECK instruction',
                    'recommendation': 'Add: HEALTHCHECK CMD curl -f http://localhost/ || exit 1'
                })

        by_severity = {
            'critical': sum(1 for i in issues if i['severity'] == 'critical'),
            'high': sum(1 for i in issues if i['severity'] == 'high'),
            'medium': sum(1 for i in issues if i['severity'] == 'medium'),
            'low': sum(1 for i in issues if i['severity'] == 'low')
        }

        return {
            'success': True,
            'operation': 'validate-dockerfile',
            'file': dockerfile,
            'issues_found': len(issues),
            'by_severity': by_severity,
            'issues': issues,
            'execution_time_ms': self._get_execution_time()
        }

    def validate_k8s(self) -> Dict:
        """Validate Kubernetes manifests"""
        k8s_dir = self.context.get('dir', './k8s')

        if not os.path.exists(k8s_dir):
            return {'success': False, 'error': f"Directory not found: {k8s_dir}"}

        all_issues = []
        files_validated = 0

        for yaml_file in Path(k8s_dir).rglob('*.yaml'):
            files_validated += 1
            issues = self._validate_k8s_file(yaml_file)
            all_issues.extend(issues)

        by_severity = {
            'critical': sum(1 for i in all_issues if i['severity'] == 'critical'),
            'high': sum(1 for i in all_issues if i['severity'] == 'high'),
            'medium': sum(1 for i in all_issues if i['severity'] == 'medium'),
            'low': sum(1 for i in all_issues if i['severity'] == 'low')
        }

        return {
            'success': True,
            'operation': 'validate-k8s',
            'files_validated': files_validated,
            'issues_found': len(all_issues),
            'by_severity': by_severity,
            'issues': all_issues[:50],  # Limit output
            'execution_time_ms': self._get_execution_time()
        }

    def _validate_k8s_file(self, yaml_file: Path) -> List[Dict]:
        """Validate a single Kubernetes YAML file"""
        issues = []

        try:
            with open(yaml_file, 'r') as f:
                docs = yaml.safe_load_all(f)

                for doc in docs:
                    if not doc:
                        continue

                    kind = doc.get('kind', '')

                    if kind == 'Deployment':
                        # Check for resource limits
                        containers = doc.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [])

                        for container in containers:
                            if 'resources' not in container:
                                issues.append({
                                    'file': str(yaml_file),
                                    'severity': 'high',
                                    'type': 'missing_resources',
                                    'description': f"Container '{container.get('name')}' missing resource limits",
                                    'recommendation': 'Add resources.limits.memory and resources.limits.cpu'
                                })

                            if 'livenessProbe' not in container:
                                issues.append({
                                    'file': str(yaml_file),
                                    'severity': 'medium',
                                    'type': 'missing_probe',
                                    'description': f"Container '{container.get('name')}' missing livenessProbe",
                                    'recommendation': 'Add livenessProbe to container spec'
                                })

                            # Check for privileged mode
                            security_context = container.get('securityContext', {})
                            if security_context.get('privileged', False):
                                issues.append({
                                    'file': str(yaml_file),
                                    'severity': 'critical',
                                    'type': 'privileged_container',
                                    'description': 'Container runs in privileged mode',
                                    'recommendation': 'Remove privileged: true or use specific capabilities'
                                })

                    elif kind == 'Service':
                        # Check for exposed services
                        service_type = doc.get('spec', {}).get('type', 'ClusterIP')
                        if service_type == 'LoadBalancer':
                            issues.append({
                                'file': str(yaml_file),
                                'severity': 'medium',
                                'type': 'exposed_service',
                                'description': 'Service exposed via LoadBalancer',
                                'recommendation': 'Ensure proper security controls are in place'
                            })

        except Exception as e:
            issues.append({
                'file': str(yaml_file),
                'severity': 'high',
                'type': 'parse_error',
                'description': f"Failed to parse YAML: {str(e)}",
                'recommendation': 'Fix YAML syntax errors'
            })

        return issues

    def validate_compose(self) -> Dict:
        """Validate docker-compose.yml"""
        compose_file = self.context.get('file', 'docker-compose.yml')

        if not os.path.exists(compose_file):
            return {'success': False, 'error': f"File not found: {compose_file}"}

        issues = []

        with open(compose_file, 'r') as f:
            try:
                compose = yaml.safe_load(f)
                services = compose.get('services', {})

                for service_name, service_config in services.items():
                    # Check for exposed ports without security
                    if 'ports' in service_config:
                        issues.append({
                            'service': service_name,
                            'severity': 'high',
                            'type': 'exposed_port',
                            'description': 'Port exposed without explicit security configuration',
                            'recommendation': 'Use internal network or add authentication'
                        })

                    # Check for privileged mode
                    if service_config.get('privileged', False):
                        issues.append({
                            'service': service_name,
                            'severity': 'critical',
                            'type': 'privileged_mode',
                            'description': 'Service runs in privileged mode',
                            'recommendation': 'Remove privileged flag'
                        })

                    # Check for missing restart policy
                    if 'restart' not in service_config:
                        issues.append({
                            'service': service_name,
                            'severity': 'medium',
                            'type': 'no_restart_policy',
                            'description': 'Missing restart policy',
                            'recommendation': 'Add: restart: unless-stopped'
                        })

            except Exception as e:
                issues.append({
                    'severity': 'high',
                    'type': 'parse_error',
                    'description': f"Failed to parse compose file: {str(e)}",
                    'recommendation': 'Fix YAML syntax errors'
                })

        return {
            'success': True,
            'operation': 'validate-compose',
            'file': compose_file,
            'services': len(services) if not issues or issues[0]['type'] != 'parse_error' else 0,
            'issues_found': len(issues),
            'issues': issues,
            'execution_time_ms': self._get_execution_time()
        }

    def validate_all(self) -> Dict:
        """Comprehensive container validation"""
        directory = self.context.get('dir', '.')

        results = {}
        total_issues = 0

        # Check for Dockerfile
        if os.path.exists(os.path.join(directory, 'Dockerfile')):
            self.context['file'] = os.path.join(directory, 'Dockerfile')
            results['dockerfile'] = self.validate_dockerfile()
            total_issues += results['dockerfile']['issues_found']

        # Check for Kubernetes manifests
        k8s_dir = os.path.join(directory, 'k8s')
        if os.path.exists(k8s_dir):
            self.context['dir'] = k8s_dir
            results['kubernetes'] = self.validate_k8s()
            total_issues += results['kubernetes']['issues_found']

        # Check for docker-compose
        compose_file = os.path.join(directory, 'docker-compose.yml')
        if os.path.exists(compose_file):
            self.context['file'] = compose_file
            results['compose'] = self.validate_compose()
            total_issues += results['compose']['issues_found']

        # Calculate severity breakdown
        by_severity = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for result in results.values():
            if 'by_severity' in result:
                for sev, count in result['by_severity'].items():
                    by_severity[sev] += count

        return {
            'success': True,
            'operation': 'validate-all',
            'summary': {
                'dockerfiles': 1 if 'dockerfile' in results else 0,
                'k8s_manifests': results.get('kubernetes', {}).get('files_validated', 0),
                'compose_files': 1 if 'compose' in results else 0,
                'total_issues': total_issues,
                **by_severity
            },
            'results': results,
            'execution_time_ms': self._get_execution_time()
        }

    def _get_execution_time(self) -> int:
        """Calculate execution time in milliseconds"""
        return int((datetime.now() - self.start_time).total_seconds() * 1000)

def main():
    """Main entry point"""
    context_json = os.environ.get('SKILL_CONTEXT', '{}')
    context = json.loads(context_json) if context_json else {}

    # Parse command line arguments
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--operation' and i + 1 < len(args):
            context['operation'] = args[i + 1]
            i += 2
        elif args[i] == '--file' and i + 1 < len(args):
            context['file'] = args[i + 1]
            i += 2
        elif args[i] == '--dir' and i + 1 < len(args):
            context['dir'] = args[i + 1]
            i += 2
        else:
            i += 1

    operation = context.get('operation', 'validate-all')
    skill = ContainerValidatorSkill(context)

    try:
        if operation == 'validate-dockerfile':
            result = skill.validate_dockerfile()
        elif operation == 'validate-k8s':
            result = skill.validate_k8s()
        elif operation == 'validate-compose':
            result = skill.validate_compose()
        elif operation == 'validate-all':
            result = skill.validate_all()
        else:
            result = {'success': False, 'error': f"Unknown operation: {operation}"}

        result['operation'] = operation
        print(json.dumps(result, indent=2))
        sys.exit(0 if result.get('success', False) else 1)

    except Exception as e:
        result = {'success': False, 'operation': operation, 'error': str(e)}
        print(json.dumps(result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
