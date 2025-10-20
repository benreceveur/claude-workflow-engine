#!/usr/bin/env python3
"""
Documentation Sync Skill - Main Entry Point
Detects code/documentation drift, validates examples, generates diagrams
"""

import json
import sys
import os
import re
import ast
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

@dataclass
class DriftIssue:
    type: str
    location: str
    severity: str
    documented: Optional[str] = None
    actual: Optional[str] = None
    feature: Optional[str] = None
    suggestion: Optional[str] = None

@dataclass
class ExampleResult:
    example_id: str
    location: str
    language: str
    status: str
    error: Optional[str] = None
    suggestion: Optional[str] = None
    execution_time_ms: int = 0

class DocumentationSyncSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()

    def detect_drift(self) -> Dict:
        """Detect code/documentation drift"""
        doc_file = self.context.get('doc_file', 'README.md')
        doc_dir = self.context.get('doc_dir')
        code_dir = self.context.get('code_dir', './src')

        issues = []

        # Get documentation files
        doc_files = []
        if doc_file and os.path.exists(doc_file):
            doc_files.append(doc_file)
        elif doc_dir and os.path.exists(doc_dir):
            doc_files = list(Path(doc_dir).rglob('*.md'))

        # Get code files
        code_files = []
        if os.path.exists(code_dir):
            code_files = list(Path(code_dir).rglob('*.py'))

        # Check API signatures
        if self.context.get('check_api_signatures', True):
            api_issues = self._check_api_signatures(doc_files, code_files)
            issues.extend(api_issues)

        # Check for deprecated features
        if self.context.get('check_deprecated', True):
            deprecated_issues = self._check_deprecated_features(doc_files, code_files)
            issues.extend(deprecated_issues)

        # Check for missing documentation
        missing_issues = self._check_missing_documentation(doc_files, code_files)
        issues.extend(missing_issues)

        return {
            'success': True,
            'operation': 'detect-drift',
            'drift_detected': len(issues) > 0,
            'drift_count': len(issues),
            'issues': [asdict(issue) for issue in issues],
            'execution_time_ms': self._get_execution_time()
        }

    def _check_api_signatures(self, doc_files: List[Path], code_files: List[Path]) -> List[DriftIssue]:
        """Check if documented API signatures match code"""
        issues = []

        # Extract function signatures from code
        code_signatures = {}
        for code_file in code_files:
            try:
                with open(code_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            if not node.name.startswith('_'):  # Public functions only
                                sig = self._get_function_signature(node)
                                code_signatures[node.name] = {
                                    'signature': sig,
                                    'file': str(code_file),
                                    'line': node.lineno
                                }
            except:
                continue

        # Check documentation for matching signatures
        for doc_file in doc_files:
            try:
                with open(doc_file, 'r') as f:
                    content = f.read()
                    lines = content.split('\n')

                    # Find function calls in code blocks
                    in_code_block = False
                    for i, line in enumerate(lines):
                        if line.strip().startswith('```'):
                            in_code_block = not in_code_block
                            continue

                        if in_code_block:
                            # Look for function calls
                            for func_name, func_data in code_signatures.items():
                                pattern = rf'\b{func_name}\s*\([^)]*\)'
                                match = re.search(pattern, line)
                                if match:
                                    documented_call = match.group(0)
                                    actual_sig = func_data['signature']

                                    # Simple comparison - could be more sophisticated
                                    if documented_call != actual_sig:
                                        issues.append(DriftIssue(
                                            type='signature_mismatch',
                                            location=f"{doc_file}:{i+1}",
                                            documented=documented_call,
                                            actual=actual_sig,
                                            severity='high',
                                            suggestion=f"Update signature to match {func_data['file']}"
                                        ))
            except:
                continue

        return issues

    def _get_function_signature(self, node: ast.FunctionDef) -> str:
        """Extract function signature as string"""
        args = []
        for arg in node.args.args:
            arg_str = arg.arg
            if arg.annotation:
                arg_str += f": {ast.unparse(arg.annotation)}"
            args.append(arg_str)

        # Add defaults
        defaults = node.args.defaults
        if defaults:
            num_defaults = len(defaults)
            for i in range(num_defaults):
                arg_idx = len(args) - num_defaults + i
                if arg_idx >= 0:
                    args[arg_idx] += f"={ast.unparse(defaults[i])}"

        return f"{node.name}({', '.join(args)})"

    def _check_deprecated_features(self, doc_files: List[Path], code_files: List[Path]) -> List[DriftIssue]:
        """Check for deprecated features still in documentation"""
        issues = []

        # Find deprecated features in code
        deprecated_features = set()
        for code_file in code_files:
            try:
                with open(code_file, 'r') as f:
                    content = f.read()
                    # Look for deprecation decorators and comments
                    deprecated_matches = re.finditer(r'@deprecated|# DEPRECATED|warnings\.warn.*deprecated', content, re.IGNORECASE)
                    for match in deprecated_matches:
                        # Extract the feature name (simplified)
                        context = content[max(0, match.start()-100):match.end()+100]
                        feature_match = re.search(r'def\s+(\w+)|class\s+(\w+)|(\w+)\s*=', context)
                        if feature_match:
                            feature = feature_match.group(1) or feature_match.group(2) or feature_match.group(3)
                            deprecated_features.add(feature)
            except:
                continue

        # Check if deprecated features are in documentation
        for doc_file in doc_files:
            try:
                with open(doc_file, 'r') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        for feature in deprecated_features:
                            if feature in line and 'deprecated' not in line.lower():
                                issues.append(DriftIssue(
                                    type='deprecated_feature',
                                    location=f"{doc_file}:{i+1}",
                                    feature=feature,
                                    severity='medium',
                                    suggestion='Remove or mark as deprecated in docs'
                                ))
            except:
                continue

        return issues

    def _check_missing_documentation(self, doc_files: List[Path], code_files: List[Path]) -> List[DriftIssue]:
        """Check for code features missing documentation"""
        issues = []

        # Get public APIs from code
        public_apis = set()
        for code_file in code_files:
            try:
                with open(code_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                            if not node.name.startswith('_'):
                                public_apis.add(node.name)
            except:
                continue

        # Check if APIs are documented
        documented_apis = set()
        for doc_file in doc_files:
            try:
                with open(doc_file, 'r') as f:
                    content = f.read()
                    for api in public_apis:
                        if api in content:
                            documented_apis.add(api)
            except:
                continue

        # Find undocumented APIs
        undocumented = public_apis - documented_apis
        for api in list(undocumented)[:5]:  # Limit to first 5
            issues.append(DriftIssue(
                type='missing_documentation',
                location='code',
                feature=api,
                severity='medium',
                suggestion=f"Add documentation for {api}"
            ))

        return issues

    def validate_examples(self) -> Dict:
        """Validate code examples in documentation"""
        doc_file = self.context.get('doc_file', 'README.md')
        execute = self.context.get('execute', False)

        if not os.path.exists(doc_file):
            return {
                'success': False,
                'error': f"Documentation file not found: {doc_file}"
            }

        examples = self._extract_code_examples(doc_file)
        results = []

        for example in examples:
            result = self._validate_example(example, execute)
            results.append(result)

        passed = sum(1 for r in results if r.status == 'passed')
        failed = sum(1 for r in results if r.status == 'failed')

        return {
            'success': True,
            'operation': 'validate-examples',
            'examples_found': len(examples),
            'examples_passed': passed,
            'examples_failed': failed,
            'results': [asdict(r) for r in results],
            'execution_time_ms': self._get_execution_time()
        }

    def _extract_code_examples(self, doc_file: str) -> List[Dict]:
        """Extract code examples from markdown"""
        examples = []

        with open(doc_file, 'r') as f:
            lines = f.readlines()
            in_code_block = False
            current_example = []
            language = 'python'
            start_line = 0

            for i, line in enumerate(lines):
                if line.strip().startswith('```'):
                    if not in_code_block:
                        in_code_block = True
                        start_line = i + 1
                        # Extract language
                        lang_match = re.search(r'```(\w+)', line)
                        if lang_match:
                            language = lang_match.group(1)
                        current_example = []
                    else:
                        in_code_block = False
                        if current_example:
                            examples.append({
                                'id': f"example-{len(examples)+1}",
                                'location': f"{doc_file}:{start_line}-{i}",
                                'language': language,
                                'code': '\n'.join(current_example)
                            })
                elif in_code_block:
                    current_example.append(line.rstrip())

        return examples

    def _validate_example(self, example: Dict, execute: bool) -> ExampleResult:
        """Validate a single code example"""
        start = datetime.now()

        # Basic syntax validation
        if example['language'] == 'python':
            try:
                compile(example['code'], '<string>', 'exec')
                status = 'passed'
                error = None
            except SyntaxError as e:
                status = 'failed'
                error = f"SyntaxError: {str(e)}"

            # Execute if requested
            if execute and status == 'passed':
                try:
                    exec(example['code'], {})
                except Exception as e:
                    status = 'failed'
                    error = f"{type(e).__name__}: {str(e)}"
        else:
            # For non-Python languages, just check syntax basics
            status = 'passed' if len(example['code'].strip()) > 0 else 'failed'
            error = None if status == 'passed' else 'Empty code block'

        execution_time = int((datetime.now() - start).total_seconds() * 1000)

        return ExampleResult(
            example_id=example['id'],
            location=example['location'],
            language=example['language'],
            status=status,
            error=error,
            execution_time_ms=execution_time
        )

    def generate_diagram(self) -> Dict:
        """Generate architecture diagram from code"""
        code_dir = self.context.get('code_dir', './src')
        diagram_type = self.context.get('diagram_type', 'component')
        format_type = self.context.get('format', 'mermaid')

        if not os.path.exists(code_dir):
            return {
                'success': False,
                'error': f"Code directory not found: {code_dir}"
            }

        if diagram_type == 'component':
            diagram = self._generate_component_diagram(code_dir, format_type)
        elif diagram_type == 'class':
            diagram = self._generate_class_diagram(code_dir, format_type)
        else:
            return {
                'success': False,
                'error': f"Unsupported diagram type: {diagram_type}"
            }

        return {
            'success': True,
            'operation': 'generate-diagram',
            'diagram_type': diagram_type,
            'format': format_type,
            'diagram': diagram,
            'execution_time_ms': self._get_execution_time()
        }

    def _generate_component_diagram(self, code_dir: str, format_type: str) -> str:
        """Generate component/module dependency diagram"""
        # Analyze imports to build dependency graph
        modules = {}

        for py_file in Path(code_dir).rglob('*.py'):
            module_name = py_file.stem
            imports = []

            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                imports.append(alias.name)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                imports.append(node.module)

                modules[module_name] = imports
            except:
                continue

        # Generate Mermaid diagram
        if format_type == 'mermaid':
            lines = ['graph TD']
            node_id = 0
            node_map = {}

            for module, deps in modules.items():
                if module not in node_map:
                    node_map[module] = chr(65 + node_id)
                    node_id += 1
                    lines.append(f"  {node_map[module]}[{module}]")

                for dep in deps[:3]:  # Limit dependencies shown
                    if dep in modules:
                        if dep not in node_map:
                            node_map[dep] = chr(65 + node_id)
                            node_id += 1
                            lines.append(f"  {node_map[dep]}[{dep}]")
                        lines.append(f"  {node_map[module]} --> {node_map[dep]}")

            return '\n'.join(lines)

        return "Unsupported format"

    def _generate_class_diagram(self, code_dir: str, format_type: str) -> str:
        """Generate class relationship diagram"""
        classes = {}

        for py_file in Path(code_dir).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            classes[node.name] = {
                                'bases': [base.id for base in node.bases if isinstance(base, ast.Name)],
                                'methods': [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
                            }
            except:
                continue

        # Generate Mermaid class diagram
        if format_type == 'mermaid':
            lines = ['classDiagram']
            for class_name, class_data in classes.items():
                lines.append(f"  class {class_name} {{")
                for method in class_data['methods'][:5]:  # Limit methods shown
                    lines.append(f"    +{method}()")
                lines.append("  }")

                for base in class_data['bases']:
                    if base in classes:
                        lines.append(f"  {base} <|-- {class_name}")

            return '\n'.join(lines)

        return "Unsupported format"

    def update_readme(self) -> Dict:
        """Update README with current API information"""
        readme_file = self.context.get('readme_file', 'README.md')
        code_dir = self.context.get('code_dir', './src')
        dry_run = self.context.get('dry_run', False)

        if not os.path.exists(readme_file):
            return {
                'success': False,
                'error': f"README file not found: {readme_file}"
            }

        # Backup original
        if not dry_run:
            backup_file = f"{readme_file}.backup"
            with open(readme_file, 'r') as f:
                content = f.read()
            with open(backup_file, 'w') as f:
                f.write(content)
        else:
            backup_file = None

        # Extract API information from code
        api_info = self._extract_api_info(code_dir)

        # Update README sections
        changes = []
        with open(readme_file, 'r') as f:
            content = f.read()

        # Find and update API section
        api_section_pattern = r'## API Reference.*?(?=\n## |\Z)'
        api_section_match = re.search(api_section_pattern, content, re.DOTALL)

        if api_section_match:
            new_api_section = self._generate_api_section(api_info)
            updated_content = content[:api_section_match.start()] + new_api_section + content[api_section_match.end():]

            changes.append({
                'section': 'API Reference',
                'action': 'updated',
                'lines_changed': len(new_api_section.split('\n'))
            })

            if not dry_run:
                with open(readme_file, 'w') as f:
                    f.write(updated_content)

        return {
            'success': True,
            'operation': 'update-readme',
            'file': readme_file,
            'backup_file': backup_file,
            'dry_run': dry_run,
            'changes': changes,
            'execution_time_ms': self._get_execution_time()
        }

    def _extract_api_info(self, code_dir: str) -> Dict:
        """Extract API information from code"""
        api_info = {
            'functions': [],
            'classes': []
        }

        for py_file in Path(code_dir).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            if not node.name.startswith('_'):
                                api_info['functions'].append({
                                    'name': node.name,
                                    'signature': self._get_function_signature(node),
                                    'docstring': ast.get_docstring(node)
                                })
                        elif isinstance(node, ast.ClassDef):
                            if not node.name.startswith('_'):
                                api_info['classes'].append({
                                    'name': node.name,
                                    'docstring': ast.get_docstring(node)
                                })
            except:
                continue

        return api_info

    def _generate_api_section(self, api_info: Dict) -> str:
        """Generate API documentation section"""
        lines = ['## API Reference\n']

        if api_info['functions']:
            lines.append('### Functions\n')
            for func in api_info['functions'][:10]:  # Limit to 10
                lines.append(f"#### {func['signature']}\n")
                if func['docstring']:
                    lines.append(f"{func['docstring']}\n")
                lines.append('')

        if api_info['classes']:
            lines.append('### Classes\n')
            for cls in api_info['classes'][:10]:  # Limit to 10
                lines.append(f"#### {cls['name']}\n")
                if cls['docstring']:
                    lines.append(f"{cls['docstring']}\n")
                lines.append('')

        return '\n'.join(lines)

    def analyze_coverage(self) -> Dict:
        """Analyze documentation coverage"""
        code_dir = self.context.get('code_dir', './src')
        doc_dir = self.context.get('doc_dir', './docs')

        # Count public APIs
        public_apis = set()
        for py_file in Path(code_dir).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                            if not node.name.startswith('_'):
                                public_apis.add(node.name)
            except:
                continue

        # Count documented APIs
        documented_apis = set()
        if os.path.exists(doc_dir):
            for doc_file in Path(doc_dir).rglob('*.md'):
                try:
                    with open(doc_file, 'r') as f:
                        content = f.read()
                        for api in public_apis:
                            if api in content:
                                documented_apis.add(api)
                except:
                    continue

        # Calculate metrics
        total_apis = len(public_apis)
        documented_count = len(documented_apis)
        api_coverage = int((documented_count / total_apis * 100)) if total_apis > 0 else 0

        return {
            'success': True,
            'operation': 'analyze-coverage',
            'overall_score': api_coverage,
            'metrics': {
                'api_coverage': {
                    'percentage': api_coverage,
                    'documented': documented_count,
                    'undocumented': total_apis - documented_count,
                    'status': 'adequate' if api_coverage >= 80 else 'below_threshold'
                }
            },
            'execution_time_ms': self._get_execution_time()
        }

    def sync_all(self) -> Dict:
        """Comprehensive documentation synchronization"""
        results = {
            'drift_detection': self.detect_drift(),
            'example_validation': self.validate_examples(),
            'coverage_analysis': self.analyze_coverage()
        }

        return {
            'success': True,
            'operation': 'sync-all',
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'drift_issues': results['drift_detection']['drift_count'],
                'example_failures': results['example_validation']['examples_failed'],
                'coverage_score': results['coverage_analysis']['overall_score']
            },
            'execution_time_ms': self._get_execution_time()
        }

    def _get_execution_time(self) -> int:
        """Calculate execution time in milliseconds"""
        return int((datetime.now() - self.start_time).total_seconds() * 1000)

def main():
    """Main entry point"""
    # Get context from environment or command line
    context_json = os.environ.get('SKILL_CONTEXT', '{}')
    context = json.loads(context_json) if context_json else {}

    # Parse command line arguments
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--operation' and i + 1 < len(args):
            context['operation'] = args[i + 1]
            i += 2
        elif args[i] == '--doc-file' and i + 1 < len(args):
            context['doc_file'] = args[i + 1]
            i += 2
        elif args[i] == '--code-dir' and i + 1 < len(args):
            context['code_dir'] = args[i + 1]
            i += 2
        elif args[i] == '--execute':
            context['execute'] = True
            i += 1
        elif args[i] == '--dry-run':
            context['dry_run'] = True
            i += 1
        else:
            i += 1

    operation = context.get('operation', 'detect-drift')

    # Create skill instance and execute
    skill = DocumentationSyncSkill(context)

    try:
        if operation == 'detect-drift':
            result = skill.detect_drift()
        elif operation == 'validate-examples':
            result = skill.validate_examples()
        elif operation == 'generate-diagram':
            result = skill.generate_diagram()
        elif operation == 'update-readme':
            result = skill.update_readme()
        elif operation == 'analyze-coverage':
            result = skill.analyze_coverage()
        elif operation == 'sync-all':
            result = skill.sync_all()
        else:
            result = {
                'success': False,
                'error': f"Unknown operation: {operation}"
            }

        result['operation'] = operation
        print(json.dumps(result, indent=2))
        sys.exit(0 if result.get('success', False) else 1)

    except Exception as e:
        result = {
            'success': False,
            'operation': operation,
            'error': str(e)
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
