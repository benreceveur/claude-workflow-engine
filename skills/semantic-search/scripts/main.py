#!/usr/bin/env python3
"""
Semantic Search Skill - Main Entry Point
Natural language code search and pattern detection
"""

import json
import sys
import os
import re
import ast
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from difflib import SequenceMatcher

class SemanticSearchSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()

    def search(self) -> Dict:
        """Natural language code search"""
        query = self.context.get('query', '')
        path = self.context.get('path', './src')
        max_results = self.context.get('max_results', 10)

        if not query:
            return {'success': False, 'error': 'Query required'}

        # Tokenize query
        query_tokens = self._tokenize(query.lower())

        results = []

        # Search through Python files
        for py_file in Path(path).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())

                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            # Calculate relevance
                            func_name = node.name
                            docstring = ast.get_docstring(node) or ''

                            relevance = self._calculate_relevance(
                                query_tokens,
                                func_name,
                                docstring
                            )

                            if relevance > 0.5:
                                results.append({
                                    'file': str(py_file),
                                    'function': func_name,
                                    'line': node.lineno,
                                    'relevance': round(relevance, 2),
                                    'snippet': f"def {func_name}(...)"
                                })
            except:
                continue

        # Sort by relevance
        results.sort(key=lambda x: x['relevance'], reverse=True)

        return {
            'success': True,
            'operation': 'search',
            'query': query,
            'results_found': len(results),
            'results': results[:max_results],
            'execution_time_ms': self._get_execution_time()
        }

    def find_similar(self) -> Dict:
        """Find semantically similar code"""
        target_file = self.context.get('file')
        target_function = self.context.get('function')

        if not target_file or not target_function:
            return {'success': False, 'error': 'File and function required'}

        # Get target function code
        target_code = self._get_function_code(target_file, target_function)

        if not target_code:
            return {'success': False, 'error': 'Function not found'}

        # Search for similar functions
        similar = []
        base_dir = Path(target_file).parent.parent

        for py_file in base_dir.rglob('*.py'):
            if py_file == Path(target_file):
                continue

            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())

                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            func_code = ast.unparse(node)
                            similarity = self._calculate_similarity(
                                target_code,
                                func_code
                            )

                            if similarity > 0.7:
                                similar.append({
                                    'file': str(py_file),
                                    'function': node.name,
                                    'similarity': round(similarity, 2),
                                    'reason': self._explain_similarity(similarity)
                                })
            except:
                continue

        similar.sort(key=lambda x: x['similarity'], reverse=True)

        return {
            'success': True,
            'operation': 'find-similar',
            'target': f"{Path(target_file).name}:{target_function}",
            'similar_functions_found': len(similar),
            'similar_functions': similar[:10],
            'execution_time_ms': self._get_execution_time()
        }

    def detect_patterns(self) -> Dict:
        """Detect common code patterns"""
        path = self.context.get('path', './src')

        patterns = {
            'try_except_pattern': 0,
            'context_manager': 0,
            'decorator_usage': 0,
            'list_comprehension': 0,
            'generator_expression': 0
        }

        pattern_examples = {}

        for py_file in Path(path).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    tree = ast.parse(content)

                    for node in ast.walk(tree):
                        # Try-except pattern
                        if isinstance(node, ast.Try):
                            patterns['try_except_pattern'] += 1
                            if 'try_except_pattern' not in pattern_examples:
                                pattern_examples['try_except_pattern'] = f"{py_file}:{node.lineno}"

                        # Context manager (with statement)
                        if isinstance(node, ast.With):
                            patterns['context_manager'] += 1
                            if 'context_manager' not in pattern_examples:
                                pattern_examples['context_manager'] = f"{py_file}:{node.lineno}"

                        # Decorator usage
                        if isinstance(node, ast.FunctionDef) and node.decorator_list:
                            patterns['decorator_usage'] += 1
                            if 'decorator_usage' not in pattern_examples:
                                pattern_examples['decorator_usage'] = f"{py_file}:{node.lineno}"

                        # List comprehension
                        if isinstance(node, ast.ListComp):
                            patterns['list_comprehension'] += 1
                            if 'list_comprehension' not in pattern_examples:
                                pattern_examples['list_comprehension'] = f"{py_file}:{node.lineno}"

                        # Generator expression
                        if isinstance(node, ast.GeneratorExp):
                            patterns['generator_expression'] += 1
                            if 'generator_expression' not in pattern_examples:
                                pattern_examples['generator_expression'] = f"{py_file}:{node.lineno}"
            except:
                continue

        # Format results
        pattern_list = []
        for pattern_type, count in patterns.items():
            if count > 0:
                pattern_list.append({
                    'type': pattern_type,
                    'occurrences': count,
                    'description': self._get_pattern_description(pattern_type),
                    'example_location': pattern_examples.get(pattern_type, 'N/A')
                })

        pattern_list.sort(key=lambda x: x['occurrences'], reverse=True)

        return {
            'success': True,
            'operation': 'detect-patterns',
            'patterns_found': len(pattern_list),
            'patterns': pattern_list,
            'execution_time_ms': self._get_execution_time()
        }

    def find_duplicates(self) -> Dict:
        """Find duplicate code blocks"""
        path = self.context.get('path', './src')
        threshold = self.context.get('threshold', 0.85)

        duplicates = []
        functions = []

        # Collect all functions
        for py_file in Path(path).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())

                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            code = ast.unparse(node)
                            functions.append({
                                'file': str(py_file),
                                'name': node.name,
                                'line': node.lineno,
                                'code': code,
                                'lines': len(code.split('\n'))
                            })
            except:
                continue

        # Compare functions
        for i in range(len(functions)):
            for j in range(i + 1, len(functions)):
                func1 = functions[i]
                func2 = functions[j]

                similarity = self._calculate_similarity(
                    func1['code'],
                    func2['code']
                )

                if similarity >= threshold:
                    duplicates.append({
                        'files': [
                            f"{Path(func1['file']).name}:{func1['line']}",
                            f"{Path(func2['file']).name}:{func2['line']}"
                        ],
                        'similarity': round(similarity, 2),
                        'lines': min(func1['lines'], func2['lines']),
                        'recommendation': self._get_duplicate_recommendation(similarity)
                    })

        duplicates.sort(key=lambda x: x['similarity'], reverse=True)

        return {
            'success': True,
            'operation': 'find-duplicates',
            'threshold': threshold,
            'duplicates_found': len(duplicates),
            'duplicates': duplicates[:10],
            'execution_time_ms': self._get_execution_time()
        }

    def analyze_usage(self) -> Dict:
        """Analyze API usage patterns"""
        path = self.context.get('path', './src')
        api_name = self.context.get('api', '')

        usages = []

        for py_file in Path(path).rglob('*.py'):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    lines = content.split('\n')

                    for i, line in enumerate(lines):
                        if api_name and api_name in line:
                            usages.append({
                                'file': str(py_file),
                                'line': i + 1,
                                'context': line.strip()
                            })
            except:
                continue

        return {
            'success': True,
            'operation': 'analyze-usage',
            'api': api_name,
            'usages_found': len(usages),
            'usages': usages[:20],
            'execution_time_ms': self._get_execution_time()
        }

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text for searching"""
        return re.findall(r'\w+', text.lower())

    def _calculate_relevance(self, query_tokens: List[str], func_name: str, docstring: str) -> float:
        """Calculate relevance score"""
        target_text = f"{func_name} {docstring}".lower()
        target_tokens = self._tokenize(target_text)

        if not target_tokens:
            return 0.0

        matches = sum(1 for token in query_tokens if token in target_tokens)
        return matches / len(query_tokens)

    def _calculate_similarity(self, code1: str, code2: str) -> float:
        """Calculate code similarity"""
        return SequenceMatcher(None, code1, code2).ratio()

    def _explain_similarity(self, similarity: float) -> str:
        """Explain why code is similar"""
        if similarity > 0.9:
            return "Nearly identical implementation"
        elif similarity > 0.8:
            return "Similar logic with minor differences"
        elif similarity > 0.7:
            return "Common patterns and structure"
        return "Some structural similarities"

    def _get_pattern_description(self, pattern_type: str) -> str:
        """Get pattern description"""
        descriptions = {
            'try_except_pattern': 'Exception handling with try-except',
            'context_manager': 'Resource management with context managers',
            'decorator_usage': 'Function decoration patterns',
            'list_comprehension': 'List comprehension for transformations',
            'generator_expression': 'Generator expressions for lazy evaluation'
        }
        return descriptions.get(pattern_type, 'Code pattern')

    def _get_duplicate_recommendation(self, similarity: float) -> str:
        """Get recommendation for duplicates"""
        if similarity > 0.95:
            return "Extract to shared function immediately"
        elif similarity > 0.85:
            return "Consider refactoring to common utility"
        return "Review for potential consolidation"

    def _get_function_code(self, file_path: str, function_name: str) -> str:
        """Get function code from file"""
        try:
            with open(file_path, 'r') as f:
                tree = ast.parse(f.read())

                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) and node.name == function_name:
                        return ast.unparse(node)
        except:
            pass

        return ""

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
        elif args[i] == '--query' and i + 1 < len(args):
            context['query'] = args[i + 1]
            i += 2
        elif args[i] == '--path' and i + 1 < len(args):
            context['path'] = args[i + 1]
            i += 2
        elif args[i] == '--file' and i + 1 < len(args):
            context['file'] = args[i + 1]
            i += 2
        elif args[i] == '--function' and i + 1 < len(args):
            context['function'] = args[i + 1]
            i += 2
        elif args[i] == '--threshold' and i + 1 < len(args):
            context['threshold'] = float(args[i + 1])
            i += 2
        else:
            i += 1

    operation = context.get('operation', 'search')
    skill = SemanticSearchSkill(context)

    try:
        if operation == 'search':
            result = skill.search()
        elif operation == 'find-similar':
            result = skill.find_similar()
        elif operation == 'detect-patterns':
            result = skill.detect_patterns()
        elif operation == 'find-duplicates':
            result = skill.find_duplicates()
        elif operation == 'analyze-usage':
            result = skill.analyze_usage()
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
