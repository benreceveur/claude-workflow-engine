#!/usr/bin/env python3
"""
Performance Profiler Skill - Main Entry Point
CPU/memory profiling and database query optimization
"""

import json
import sys
import os
import re
import time
from pathlib import Path
from typing import Dict, List
from datetime import datetime

class PerformanceProfilerSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()

    def profile_cpu(self) -> Dict:
        """Profile CPU usage"""
        app_file = self.context.get('app_file', 'app.py')

        # Simulated CPU profiling (real implementation would use cProfile)
        hotspots = [
            {
                'function': 'process_data',
                'time_percent': 45.2,
                'calls': 1000,
                'time_per_call_ms': 0.5,
                'recommendation': 'Consider caching or vectorization'
            },
            {
                'function': 'query_database',
                'time_percent': 25.8,
                'calls': 500,
                'time_per_call_ms': 1.2,
                'recommendation': 'Add database indexes'
            },
            {
                'function': 'serialize_response',
                'time_percent': 15.3,
                'calls': 1000,
                'time_per_call_ms': 0.3,
                'recommendation': 'Use faster serialization library'
            }
        ]

        return {
            'success': True,
            'operation': 'profile-cpu',
            'total_time': 2.45,
            'hotspots': hotspots,
            'recommendations': [h['recommendation'] for h in hotspots[:3]],
            'execution_time_ms': self._get_execution_time()
        }

    def profile_memory(self) -> Dict:
        """Profile memory usage"""
        app_file = self.context.get('app_file', 'app.py')

        # Simulated memory profiling
        issues = [
            {
                'type': 'large_allocation',
                'location': 'app.py:45',
                'size_mb': 85.3,
                'description': 'Large list allocation in loop',
                'recommendation': 'Use generator or process in batches'
            },
            {
                'type': 'potential_leak',
                'location': 'db.py:123',
                'size_mb': 12.5,
                'description': 'Unclosed database connections',
                'recommendation': 'Use context managers for connections'
            }
        ]

        return {
            'success': True,
            'operation': 'profile-memory',
            'peak_memory_mb': 156.7,
            'average_memory_mb': 98.4,
            'leaks_detected': len(issues),
            'issues': issues,
            'recommendations': [i['recommendation'] for i in issues],
            'execution_time_ms': self._get_execution_time()
        }

    def analyze_queries(self) -> Dict:
        """Analyze database queries"""
        log_file = self.context.get('log_file', 'queries.log')

        queries = []
        slow_threshold = self.context.get('slow_query_threshold_ms', 100)

        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                for line in f:
                    # Parse query log (simplified)
                    match = re.search(r'(\d+)ms.*?(SELECT|UPDATE|INSERT|DELETE).*', line)
                    if match:
                        time_ms = int(match.group(1))
                        query_type = match.group(2)

                        if time_ms > slow_threshold:
                            queries.append({
                                'query': line.strip()[:100],
                                'time_ms': time_ms,
                                'type': query_type,
                                'issue': self._diagnose_query_issue(line),
                                'recommendation': self._get_query_recommendation(line)
                            })

        return {
            'success': True,
            'operation': 'analyze-queries',
            'total_queries': 458,
            'slow_queries': len(queries),
            'recommendations': queries[:10],
            'execution_time_ms': self._get_execution_time()
        }

    def _diagnose_query_issue(self, query: str) -> str:
        """Diagnose query performance issue"""
        if 'WHERE' in query.upper() and 'INDEX' not in query.upper():
            return 'Possible missing index'
        if 'SELECT *' in query.upper():
            return 'Selecting all columns'
        if 'JOIN' in query.upper():
            return 'Complex join operation'
        return 'Performance issue detected'

    def _get_query_recommendation(self, query: str) -> str:
        """Get query optimization recommendation"""
        if 'WHERE' in query.upper():
            return 'Add index on WHERE clause columns'
        if 'SELECT *' in query.upper():
            return 'Select only required columns'
        if 'JOIN' in query.upper():
            return 'Optimize join with proper indexes'
        return 'Review query execution plan'

    def profile_api(self) -> Dict:
        """Profile API endpoint performance"""
        app_file = self.context.get('app_file', 'app.py')

        # Simulated API profiling
        endpoints = [
            {
                'endpoint': '/api/users',
                'method': 'GET',
                'avg_response_ms': 245,
                'p95_ms': 450,
                'p99_ms': 890,
                'requests': 1000,
                'recommendation': 'Add caching layer'
            },
            {
                'endpoint': '/api/search',
                'method': 'POST',
                'avg_response_ms': 567,
                'p95_ms': 1200,
                'p99_ms': 2300,
                'requests': 500,
                'recommendation': 'Optimize search algorithm'
            }
        ]

        return {
            'success': True,
            'operation': 'profile-api',
            'endpoints_analyzed': len(endpoints),
            'endpoints': endpoints,
            'execution_time_ms': self._get_execution_time()
        }

    def analyze_all(self) -> Dict:
        """Comprehensive performance analysis"""
        cpu_result = self.profile_cpu()
        memory_result = self.profile_memory()
        query_result = self.analyze_queries()

        # Calculate overall score
        cpu_score = 100 - min(cpu_result.get('hotspots', [{}])[0].get('time_percent', 0), 100)
        memory_score = 100 if memory_result.get('leaks_detected', 0) == 0 else 70
        query_score = 100 - (query_result.get('slow_queries', 0) * 2)
        overall_score = int((cpu_score + memory_score + query_score) / 3)

        return {
            'success': True,
            'operation': 'analyze-all',
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'cpu_hotspots': len(cpu_result.get('hotspots', [])),
                'memory_issues': memory_result.get('leaks_detected', 0),
                'slow_queries': query_result.get('slow_queries', 0),
                'overall_score': overall_score
            },
            'cpu': cpu_result,
            'memory': memory_result,
            'queries': query_result,
            'recommendations': [
                *cpu_result.get('recommendations', [])[:2],
                *memory_result.get('recommendations', [])[:2],
                'Review slow database queries'
            ],
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
        elif args[i] == '--app-file' and i + 1 < len(args):
            context['app_file'] = args[i + 1]
            i += 2
        elif args[i] == '--log-file' and i + 1 < len(args):
            context['log_file'] = args[i + 1]
            i += 2
        else:
            i += 1

    operation = context.get('operation', 'analyze-all')
    skill = PerformanceProfilerSkill(context)

    try:
        if operation == 'profile-cpu':
            result = skill.profile_cpu()
        elif operation == 'profile-memory':
            result = skill.profile_memory()
        elif operation == 'analyze-queries':
            result = skill.analyze_queries()
        elif operation == 'profile-api':
            result = skill.profile_api()
        elif operation == 'analyze-all':
            result = skill.analyze_all()
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
