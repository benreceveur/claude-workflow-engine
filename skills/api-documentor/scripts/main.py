#!/usr/bin/env python3
"""
API Documentor Skill - Main Entry Point
Generates OpenAPI/GraphQL documentation and client SDKs
"""

import json
import sys
import os
import re
import ast
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

@dataclass
class APIEndpoint:
    path: str
    method: str
    summary: str
    parameters: List[Dict]
    responses: Dict
    tags: List[str]

class APIDocumentorSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()

    def generate_openapi(self) -> Dict:
        """Generate OpenAPI 3.0 specification"""
        app_file = self.context.get('app_file', 'app.py')
        title = self.context.get('title', 'API Documentation')
        version = self.context.get('version', '1.0.0')

        if not os.path.exists(app_file):
            return {'success': False, 'error': f"App file not found: {app_file}"}

        endpoints = self._extract_endpoints(app_file)
        spec = self._build_openapi_spec(endpoints, title, version)

        # Save to file if output specified
        output_file = self.context.get('output')
        if output_file:
            with open(output_file, 'w') as f:
                if output_file.endswith('.json'):
                    json.dump(spec, f, indent=2)
                else:
                    import yaml
                    yaml.dump(spec, f)

        return {
            'success': True,
            'operation': 'generate-openapi',
            'spec': spec,
            'endpoints_found': len(endpoints),
            'output_file': output_file,
            'execution_time_ms': self._get_execution_time()
        }

    def _extract_endpoints(self, app_file: str) -> List[APIEndpoint]:
        """Extract API endpoints from application code"""
        endpoints = []

        with open(app_file, 'r') as f:
            content = f.read()
            lines = content.split('\n')

            # Find Flask/FastAPI route decorators
            route_pattern = r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']\)'

            for i, line in enumerate(lines):
                match = re.search(route_pattern, line)
                if match:
                    method = match.group(1).upper()
                    path = match.group(2)

                    # Extract function name and docstring
                    if i + 1 < len(lines):
                        func_match = re.search(r'def\s+(\w+)', lines[i + 1])
                        if func_match:
                            func_name = func_match.group(1)
                            summary = func_name.replace('_', ' ').title()

                            endpoints.append(APIEndpoint(
                                path=path,
                                method=method,
                                summary=summary,
                                parameters=[],
                                responses={'200': {'description': 'Successful response'}},
                                tags=[]
                            ))

        return endpoints

    def _build_openapi_spec(self, endpoints: List[APIEndpoint], title: str, version: str) -> Dict:
        """Build OpenAPI 3.0 specification"""
        spec = {
            'openapi': '3.0.0',
            'info': {
                'title': title,
                'version': version,
                'description': 'Auto-generated API documentation'
            },
            'paths': {}
        }

        for endpoint in endpoints:
            if endpoint.path not in spec['paths']:
                spec['paths'][endpoint.path] = {}

            spec['paths'][endpoint.path][endpoint.method.lower()] = {
                'summary': endpoint.summary,
                'responses': endpoint.responses
            }

        return spec

    def generate_graphql(self) -> Dict:
        """Generate GraphQL schema documentation"""
        schema_file = self.context.get('schema_file', 'schema.graphql')

        if not os.path.exists(schema_file):
            return {'success': False, 'error': f"Schema file not found: {schema_file}"}

        with open(schema_file, 'r') as f:
            schema = f.read()

        # Parse schema (simplified)
        types = re.findall(r'type\s+(\w+)\s*{([^}]+)}', schema)
        queries = re.findall(r'type\s+Query\s*{([^}]+)}', schema)

        docs = {
            'types': [{'name': t[0], 'fields': t[1].strip()} for t in types],
            'queries': queries[0].strip() if queries else ''
        }

        return {
            'success': True,
            'operation': 'generate-graphql',
            'documentation': docs,
            'execution_time_ms': self._get_execution_time()
        }

    def generate_sdk(self) -> Dict:
        """Generate client SDK"""
        spec_file = self.context.get('spec', 'openapi.yaml')
        language = self.context.get('language', 'python')
        output_dir = self.context.get('output_dir', './sdk')

        if not os.path.exists(spec_file):
            return {'success': False, 'error': f"Spec file not found: {spec_file}"}

        # Load spec
        with open(spec_file, 'r') as f:
            if spec_file.endswith('.json'):
                spec = json.load(f)
            else:
                import yaml
                spec = yaml.safe_load(f)

        # Generate SDK based on language
        if language == 'python':
            sdk_code = self._generate_python_sdk(spec)
        elif language == 'javascript' or language == 'typescript':
            sdk_code = self._generate_js_sdk(spec)
        else:
            return {'success': False, 'error': f"Unsupported language: {language}"}

        # Save SDK
        os.makedirs(output_dir, exist_ok=True)
        sdk_file = os.path.join(output_dir, f'client.{self._get_extension(language)}')
        with open(sdk_file, 'w') as f:
            f.write(sdk_code)

        return {
            'success': True,
            'operation': 'generate-sdk',
            'language': language,
            'output_file': sdk_file,
            'execution_time_ms': self._get_execution_time()
        }

    def _generate_python_sdk(self, spec: Dict) -> str:
        """Generate Python SDK code"""
        code = [
            '"""Auto-generated API Client"""',
            'import requests',
            '',
            'class APIClient:',
            '    def __init__(self, base_url, api_key=None):',
            '        self.base_url = base_url',
            '        self.api_key = api_key',
            '        self.session = requests.Session()',
            '        if api_key:',
            '            self.session.headers["Authorization"] = f"Bearer {api_key}"',
            ''
        ]

        # Generate methods for each endpoint
        for path, methods in spec.get('paths', {}).items():
            for method, details in methods.items():
                func_name = details.get('summary', path).replace(' ', '_').lower()
                func_name = re.sub(r'[^a-z0-9_]', '', func_name)

                code.append(f'    def {func_name}(self, **kwargs):')
                code.append(f'        """{ details.get("summary", "API call")}"""')
                code.append(f'        return self.session.{method}(')
                code.append(f'            f"{{self.base_url}}{path}",')
                code.append(f'            **kwargs')
                code.append(f'        ).json()')
                code.append('')

        return '\n'.join(code)

    def _generate_js_sdk(self, spec: Dict) -> str:
        """Generate JavaScript SDK code"""
        code = [
            '// Auto-generated API Client',
            'class APIClient {',
            '  constructor(baseUrl, apiKey = null) {',
            '    this.baseUrl = baseUrl;',
            '    this.apiKey = apiKey;',
            '  }',
            '',
            '  async request(method, path, options = {}) {',
            '    const headers = { "Content-Type": "application/json" };',
            '    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;',
            '    ',
            '    const response = await fetch(`${this.baseUrl}${path}`, {',
            '      method,',
            '      headers: { ...headers, ...options.headers },',
            '      body: options.body ? JSON.stringify(options.body) : undefined',
            '    });',
            '    return response.json();',
            '  }',
            ''
        ]

        # Generate methods
        for path, methods in spec.get('paths', {}).items():
            for method, details in methods.items():
                func_name = details.get('summary', path).replace(' ', '_').toLowerCase()
                func_name = re.sub(r'[^a-z0-9_]', '', func_name)

                code.append(f'  async {func_name}(options = {{}}) {{')
                code.append(f'    return this.request("{method.upper()}", "{path}", options);')
                code.append(f'  }}')
                code.append('')

        code.append('}')
        code.append('')
        code.append('module.exports = APIClient;')

        return '\n'.join(code)

    def _get_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            'python': 'py',
            'javascript': 'js',
            'typescript': 'ts',
            'go': 'go',
            'java': 'java'
        }
        return extensions.get(language, 'txt')

    def generate_docs(self) -> Dict:
        """Generate human-readable documentation"""
        spec_file = self.context.get('spec', 'openapi.yaml')
        format_type = self.context.get('format', 'html')

        if not os.path.exists(spec_file):
            return {'success': False, 'error': f"Spec file not found: {spec_file}"}

        # Load spec
        with open(spec_file, 'r') as f:
            if spec_file.endswith('.json'):
                spec = json.load(f)
            else:
                import yaml
                spec = yaml.safe_load(f)

        # Generate docs
        if format_type == 'html':
            docs = self._generate_html_docs(spec)
        elif format_type == 'markdown':
            docs = self._generate_markdown_docs(spec)
        else:
            return {'success': False, 'error': f"Unsupported format: {format_type}"}

        output_file = self.context.get('output', f'api-docs.{format_type}')
        with open(output_file, 'w') as f:
            f.write(docs)

        return {
            'success': True,
            'operation': 'generate-docs',
            'format': format_type,
            'output_file': output_file,
            'execution_time_ms': self._get_execution_time()
        }

    def _generate_markdown_docs(self, spec: Dict) -> str:
        """Generate Markdown documentation"""
        lines = [
            f"# {spec['info']['title']}",
            '',
            f"Version: {spec['info']['version']}",
            '',
            spec['info'].get('description', ''),
            '',
            '## Endpoints',
            ''
        ]

        for path, methods in spec.get('paths', {}).items():
            lines.append(f'### {path}')
            lines.append('')

            for method, details in methods.items():
                lines.append(f'**{method.upper()}**')
                lines.append('')
                lines.append(details.get('summary', 'No description'))
                lines.append('')

        return '\n'.join(lines)

    def _generate_html_docs(self, spec: Dict) -> str:
        """Generate HTML documentation"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>{spec['info']['title']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        .endpoint {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; }}
        .method {{ font-weight: bold; color: #0066cc; }}
    </style>
</head>
<body>
    <h1>{spec['info']['title']}</h1>
    <p>Version: {spec['info']['version']}</p>
    <p>{spec['info'].get('description', '')}</p>
    <h2>Endpoints</h2>
    {''.join([self._format_endpoint_html(path, methods) for path, methods in spec.get('paths', {}).items()])}
</body>
</html>
"""

    def _format_endpoint_html(self, path: str, methods: Dict) -> str:
        """Format endpoint as HTML"""
        html_parts = []
        for method, details in methods.items():
            html_parts.append(f"""
    <div class="endpoint">
        <h3>{path}</h3>
        <p class="method">{method.upper()}</p>
        <p>{details.get('summary', 'No description')}</p>
    </div>
""")
        return ''.join(html_parts)

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
        elif args[i] == '--app-file' and i + 1 < len(args):
            context['app_file'] = args[i + 1]
            i += 2
        elif args[i] == '--spec' and i + 1 < len(args):
            context['spec'] = args[i + 1]
            i += 2
        elif args[i] == '--language' and i + 1 < len(args):
            context['language'] = args[i + 1]
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            context['output'] = args[i + 1]
            i += 2
        else:
            i += 1

    operation = context.get('operation', 'generate-openapi')
    skill = APIDocumentorSkill(context)

    try:
        if operation == 'generate-openapi':
            result = skill.generate_openapi()
        elif operation == 'generate-graphql':
            result = skill.generate_graphql()
        elif operation == 'generate-sdk':
            result = skill.generate_sdk()
        elif operation == 'generate-docs':
            result = skill.generate_docs()
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
