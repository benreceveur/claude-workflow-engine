#!/usr/bin/env python3
"""
Technical Debt Tracker - Main Implementation
Identifies, measures, and prioritizes technical debt
"""

import os
import sys
import json
import subprocess
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import hashlib

class TechDebtTracker:
    """Main class for technical debt tracking operations"""

    def __init__(self, project_dir: str = "."):
        self.project_dir = Path(project_dir).resolve()
        self.config = self.load_config()
        self.results_cache = {}

    def load_config(self) -> Dict:
        """Load configuration from .techdebtrc.json or use defaults"""
        config_file = self.project_dir / ".techdebtrc.json"

        default_config = {
            "thresholds": {
                "complexity": {
                    "cyclomatic": 10,
                    "cognitive": 15,
                    "max_function_lines": 50,
                    "max_parameters": 5
                },
                "duplication": {
                    "min_duplicate_lines": 10,
                    "min_duplicate_tokens": 100
                },
                "test_coverage": {
                    "min_line_coverage": 80,
                    "min_branch_coverage": 75,
                    "critical_files_coverage": 90
                },
                "code_churn": {
                    "high_churn_threshold": 20
                },
                "maintainability": {
                    "min_maintainability_index": 65
                }
            },
            "exclude": [
                "node_modules/**",
                "dist/**",
                "build/**",
                "coverage/**",
                "*.test.js",
                "*.spec.js",
                "**/__tests__/**",
                "**/test/**",
                "**/tests/**"
            ],
            "critical_modules": []
        }

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                    # Merge with defaults
                    self.deep_merge(default_config, user_config)
            except Exception as e:
                print(f"Warning: Could not load config file: {e}", file=sys.stderr)

        return default_config

    def deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two dictionaries"""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self.deep_merge(base[key], value)
            else:
                base[key] = value
        return base

    def scan(self, languages: Optional[List[str]] = None,
             include_patterns: Optional[List[str]] = None,
             exclude_patterns: Optional[List[str]] = None,
             metrics: Optional[List[str]] = None) -> Dict:
        """Scan codebase for technical debt"""

        if metrics is None:
            metrics = ["complexity", "duplication", "churn", "coverage"]

        debt_items = []

        # Scan for high complexity
        if "complexity" in metrics:
            debt_items.extend(self.scan_complexity())

        # Scan for code duplication
        if "duplication" in metrics:
            debt_items.extend(self.scan_duplication())

        # Scan for code churn
        if "churn" in metrics and self.is_git_repo():
            debt_items.extend(self.scan_code_churn())

        # Scan for test coverage
        if "coverage" in metrics:
            debt_items.extend(self.scan_coverage())

        # Scan for code smells
        debt_items.extend(self.scan_code_smells())

        # Calculate summary
        summary = self.calculate_summary(debt_items)
        sqale_index = self.calculate_sqale_index(debt_items)

        return {
            "success": True,
            "project_path": str(self.project_dir),
            "scan_timestamp": datetime.utcnow().isoformat() + "Z",
            "debt_items": debt_items,
            "summary": summary,
            "sqale_index": sqale_index
        }

    def scan_complexity(self) -> List[Dict]:
        """Scan for high complexity code"""
        debt_items = []

        # Find all source files
        source_files = self.find_source_files()

        for file_path in source_files:
            try:
                complexity_issues = self.analyze_file_complexity(file_path)
                debt_items.extend(complexity_issues)
            except Exception as e:
                print(f"Warning: Could not analyze {file_path}: {e}", file=sys.stderr)

        return debt_items

    def analyze_file_complexity(self, file_path: Path) -> List[Dict]:
        """Analyze complexity of a single file"""
        issues = []

        # Simple complexity analysis (can be enhanced with radon, etc.)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

            # Detect functions/methods
            functions = self.extract_functions(content, file_path.suffix)

            for func in functions:
                cognitive_complexity = self.calculate_cognitive_complexity(func['code'])

                threshold = self.config['thresholds']['complexity']['cognitive']
                if cognitive_complexity > threshold:
                    issues.append({
                        "file": str(file_path.relative_to(self.project_dir)),
                        "line": func['line'],
                        "type": "high_complexity",
                        "metric": "cognitive_complexity",
                        "score": cognitive_complexity,
                        "threshold": threshold,
                        "severity": self.get_complexity_severity(cognitive_complexity, threshold),
                        "description": f"Function '{func['name']}' has cognitive complexity of {cognitive_complexity} (threshold: {threshold})",
                        "recommendation": "Extract nested conditionals into separate functions",
                        "effort_estimate": self.estimate_effort(cognitive_complexity, "complexity")
                    })

        except Exception as e:
            pass  # Skip files that can't be read

        return issues

    def extract_functions(self, content: str, extension: str) -> List[Dict]:
        """Extract functions from source code"""
        functions = []

        # Simple regex-based function detection (can be enhanced with AST parsing)
        patterns = {
            '.js': r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|\s+(\w+)\s*\([^)]*\)\s*{)',
            '.jsx': r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|\s+(\w+)\s*\([^)]*\)\s*{)',
            '.ts': r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|\s+(\w+)\s*\([^)]*\)\s*{)',
            '.tsx': r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|\s+(\w+)\s*\([^)]*\)\s*{)',
            '.py': r'def\s+(\w+)\s*\(',
            '.java': r'(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(',
            '.go': r'func\s+(?:\([^)]*\)\s+)?(\w+)\s*\('
        }

        pattern = patterns.get(extension, r'function\s+(\w+)')

        lines = content.split('\n')
        for i, line in enumerate(lines):
            match = re.search(pattern, line)
            if match:
                func_name = next((g for g in match.groups() if g), "unknown")
                # Extract function body (simplified - would need proper parsing)
                func_code = self.extract_function_body(lines, i)
                functions.append({
                    "name": func_name,
                    "line": i + 1,
                    "code": func_code
                })

        return functions

    def extract_function_body(self, lines: List[str], start_line: int) -> str:
        """Extract function body from starting line"""
        # Simplified extraction - would need proper brace matching
        body_lines = []
        brace_count = 0
        started = False

        for i in range(start_line, min(start_line + 100, len(lines))):
            line = lines[i]
            body_lines.append(line)

            # Count braces
            brace_count += line.count('{') - line.count('}')
            if '{' in line:
                started = True

            if started and brace_count == 0:
                break

        return '\n'.join(body_lines)

    def calculate_cognitive_complexity(self, code: str) -> int:
        """Calculate cognitive complexity (simplified)"""
        complexity = 0

        # Count complexity contributors
        complexity += code.count('if ')
        complexity += code.count('else ')
        complexity += code.count('for ')
        complexity += code.count('while ')
        complexity += code.count('case ')
        complexity += code.count('catch ')
        complexity += code.count('&&')
        complexity += code.count('||')
        complexity += code.count('?')  # Ternary

        # Nested structures add more complexity
        nesting_level = 0
        for char in code:
            if char == '{':
                nesting_level += 1
                complexity += nesting_level
            elif char == '}':
                nesting_level = max(0, nesting_level - 1)

        return complexity

    def get_complexity_severity(self, score: int, threshold: int) -> str:
        """Determine severity based on complexity score"""
        if score > threshold * 3:
            return "critical"
        elif score > threshold * 2:
            return "high"
        elif score > threshold:
            return "medium"
        else:
            return "low"

    def estimate_effort(self, value: int, debt_type: str) -> str:
        """Estimate effort to fix debt item"""
        if debt_type == "complexity":
            if value > 50:
                return "8+ hours"
            elif value > 30:
                return "4-8 hours"
            elif value > 20:
                return "2-4 hours"
            else:
                return "1-2 hours"
        elif debt_type == "duplication":
            if value > 100:
                return "4-6 hours"
            elif value > 50:
                return "2-4 hours"
            else:
                return "1-2 hours"
        else:
            return "2-4 hours"

    def scan_duplication(self) -> List[Dict]:
        """Scan for code duplication"""
        debt_items = []

        # Simple duplication detection (can be enhanced with jscpd, etc.)
        source_files = self.find_source_files()

        # Build hash map of code blocks
        block_hashes = {}
        min_lines = self.config['thresholds']['duplication']['min_duplicate_lines']

        for file_path in source_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                # Sliding window of N lines
                for i in range(len(lines) - min_lines + 1):
                    block = ''.join(lines[i:i+min_lines])
                    block_hash = hashlib.md5(block.encode()).hexdigest()

                    if block_hash in block_hashes:
                        # Found duplication
                        original = block_hashes[block_hash]
                        debt_items.append({
                            "file": str(file_path.relative_to(self.project_dir)),
                            "line": i + 1,
                            "type": "code_duplication",
                            "metric": "duplication",
                            "duplicated_lines": min_lines,
                            "duplicate_of": f"{original['file']}:{original['line']}",
                            "severity": "medium",
                            "description": f"{min_lines} lines duplicated across 2+ files",
                            "recommendation": "Extract common logic into shared utility function",
                            "effort_estimate": self.estimate_effort(min_lines, "duplication")
                        })
                    else:
                        block_hashes[block_hash] = {
                            "file": str(file_path.relative_to(self.project_dir)),
                            "line": i + 1
                        }

            except Exception:
                pass

        return debt_items[:50]  # Limit to top 50 duplications

    def scan_code_churn(self) -> List[Dict]:
        """Scan for high code churn (requires git)"""
        debt_items = []

        if not self.is_git_repo():
            return []

        try:
            # Get file change counts for last 90 days
            result = subprocess.run(
                ['git', 'log', '--since="90 days ago"', '--name-only', '--pretty=format:', '--'],
                cwd=self.project_dir,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                files = [f for f in result.stdout.split('\n') if f.strip()]
                file_counts = {}

                for file in files:
                    file_counts[file] = file_counts.get(file, 0) + 1

                # Find high-churn files
                threshold = self.config['thresholds']['code_churn']['high_churn_threshold']

                for file, count in sorted(file_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
                    if count > threshold:
                        # Check if file also has high complexity
                        file_path = self.project_dir / file
                        if file_path.exists():
                            complexity = self.get_file_average_complexity(file_path)
                            risk_score = (count / 10) + (complexity / 10)

                            debt_items.append({
                                "file": file,
                                "type": "high_churn",
                                "metric": "code_churn",
                                "changes": count,
                                "complexity": complexity,
                                "risk_score": round(risk_score, 1),
                                "severity": "high" if risk_score > 5 else "medium",
                                "description": f"File changed {count} times in last 90 days with complexity {complexity}",
                                "recommendation": "High churn + complexity indicates instability, consider refactoring",
                                "effort_estimate": "4-8 hours"
                            })

        except Exception as e:
            print(f"Warning: Could not analyze code churn: {e}", file=sys.stderr)

        return debt_items

    def get_file_average_complexity(self, file_path: Path) -> int:
        """Get average complexity for a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            functions = self.extract_functions(content, file_path.suffix)
            if not functions:
                return 0

            total_complexity = sum(
                self.calculate_cognitive_complexity(f['code'])
                for f in functions
            )
            return total_complexity // len(functions)

        except Exception:
            return 0

    def scan_coverage(self) -> List[Dict]:
        """Scan for missing test coverage"""
        debt_items = []

        # Check for coverage reports (simplified)
        coverage_file = self.project_dir / "coverage" / "coverage-summary.json"

        if coverage_file.exists():
            try:
                with open(coverage_file, 'r') as f:
                    coverage_data = json.load(f)

                threshold = self.config['thresholds']['test_coverage']['min_line_coverage']

                for file_path, metrics in coverage_data.items():
                    if file_path != "total":
                        line_coverage = metrics.get('lines', {}).get('pct', 100)

                        if line_coverage < threshold:
                            debt_items.append({
                                "file": file_path,
                                "type": "missing_tests",
                                "metric": "test_coverage",
                                "coverage_percentage": line_coverage,
                                "threshold": threshold,
                                "severity": "high" if line_coverage < 50 else "medium",
                                "description": f"Test coverage is {line_coverage}% (threshold: {threshold}%)",
                                "recommendation": "Add unit tests to increase coverage",
                                "effort_estimate": "2-4 hours"
                            })

            except Exception as e:
                print(f"Warning: Could not read coverage data: {e}", file=sys.stderr)

        return debt_items

    def scan_code_smells(self) -> List[Dict]:
        """Scan for code smells"""
        debt_items = []

        source_files = self.find_source_files()

        for file_path in source_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    content = ''.join(lines)

                # Long functions
                functions = self.extract_functions(content, file_path.suffix)
                for func in functions:
                    func_lines = len(func['code'].split('\n'))
                    threshold = self.config['thresholds']['complexity']['max_function_lines']

                    if func_lines > threshold:
                        debt_items.append({
                            "file": str(file_path.relative_to(self.project_dir)),
                            "line": func['line'],
                            "type": "code_smell",
                            "smell_type": "long_method",
                            "metric": "function_length",
                            "score": func_lines,
                            "threshold": threshold,
                            "severity": "medium",
                            "description": f"Function '{func['name']}' is {func_lines} lines (threshold: {threshold})",
                            "recommendation": "Break down into smaller, focused functions",
                            "effort_estimate": "2-4 hours"
                        })

                # Large files
                if len(lines) > 500:
                    debt_items.append({
                        "file": str(file_path.relative_to(self.project_dir)),
                        "line": 1,
                        "type": "code_smell",
                        "smell_type": "large_file",
                        "metric": "file_length",
                        "score": len(lines),
                        "threshold": 500,
                        "severity": "low",
                        "description": f"File has {len(lines)} lines (threshold: 500)",
                        "recommendation": "Consider splitting into multiple files",
                        "effort_estimate": "4-8 hours"
                    })

            except Exception:
                pass

        return debt_items[:30]  # Limit code smells

    def calculate_summary(self, debt_items: List[Dict]) -> Dict:
        """Calculate summary statistics"""
        summary = {
            "total_debt_items": len(debt_items),
            "by_severity": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            },
            "by_type": {}
        }

        for item in debt_items:
            severity = item.get('severity', 'medium')
            summary['by_severity'][severity] += 1

            debt_type = item.get('type', 'unknown')
            summary['by_type'][debt_type] = summary['by_type'].get(debt_type, 0) + 1

        # Estimate total effort
        total_min_hours = 0
        total_max_hours = 0

        for item in debt_items:
            effort = item.get('effort_estimate', '2-4 hours')
            min_hours, max_hours = self.parse_effort(effort)
            total_min_hours += min_hours
            total_max_hours += max_hours

        summary['total_estimated_effort'] = f"{total_min_hours}-{total_max_hours} hours"

        return summary

    def parse_effort(self, effort_str: str) -> Tuple[int, int]:
        """Parse effort estimate string"""
        if '+' in effort_str:
            # "8+ hours"
            hours = int(effort_str.split('+')[0])
            return (hours, hours + 4)
        elif '-' in effort_str:
            # "2-4 hours"
            parts = effort_str.split('-')
            return (int(parts[0]), int(parts[1].split()[0]))
        else:
            # "2 hours"
            hours = int(effort_str.split()[0])
            return (hours, hours)

    def calculate_sqale_index(self, debt_items: List[Dict]) -> Dict:
        """Calculate SQALE (Software Quality Assessment based on Lifecycle Expectations) index"""
        total_minutes = 0

        for item in debt_items:
            effort = item.get('effort_estimate', '2-4 hours')
            min_hours, max_hours = self.parse_effort(effort)
            avg_hours = (min_hours + max_hours) / 2
            total_minutes += avg_hours * 60

        total_days = total_minutes / (8 * 60)  # 8-hour work days

        # Calculate debt ratio (simplified)
        # Would need LOC count for accurate ratio
        loc = self.count_lines_of_code()
        debt_ratio = (total_days / (loc / 1000)) if loc > 0 else 0

        # Determine rating (A-E)
        if debt_ratio <= 0.05:
            rating = "A"
        elif debt_ratio <= 0.10:
            rating = "B"
        elif debt_ratio <= 0.20:
            rating = "C"
        elif debt_ratio <= 0.50:
            rating = "D"
        else:
            rating = "E"

        return {
            "total_debt_minutes": int(total_minutes),
            "total_debt_days": round(total_days, 1),
            "debt_ratio": f"{debt_ratio * 100:.1f}%",
            "rating": rating
        }

    def count_lines_of_code(self) -> int:
        """Count total lines of code"""
        total = 0

        for file_path in self.find_source_files():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    total += len(f.readlines())
            except Exception:
                pass

        return total

    def find_source_files(self) -> List[Path]:
        """Find all source files in project"""
        extensions = {'.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.rb', '.php'}
        source_files = []

        for root, dirs, files in os.walk(self.project_dir):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not self.should_exclude(os.path.join(root, d))]

            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in extensions and not self.should_exclude(str(file_path)):
                    source_files.append(file_path)

        return source_files

    def should_exclude(self, path: str) -> bool:
        """Check if path should be excluded"""
        path_str = str(path)

        for pattern in self.config['exclude']:
            # Simple glob pattern matching
            if pattern.endswith('/**'):
                prefix = pattern[:-3]
                if prefix in path_str:
                    return True
            elif pattern.startswith('**/'):
                suffix = pattern[3:]
                if path_str.endswith(suffix):
                    return True
            elif pattern.startswith('*.'):
                ext = pattern[1:]
                if path_str.endswith(ext):
                    return True
            elif pattern in path_str:
                return True

        return False

    def is_git_repo(self) -> bool:
        """Check if directory is a git repository"""
        return (self.project_dir / ".git").exists()

    def calculate_metrics(self, metric_types: List[str]) -> Dict:
        """Calculate specific debt metrics"""
        # For simplicity, run full scan and extract metrics
        scan_results = self.scan(metrics=metric_types)

        metrics = {}

        if "sqale" in metric_types:
            metrics["sqale_index"] = scan_results["sqale_index"]

        # Add other metric types as needed

        return {
            "success": True,
            "metrics": metrics
        }

    def prioritize(self, prioritization_strategy: str = "impact_effort_ratio",
                   business_context: Optional[Dict] = None) -> Dict:
        """Prioritize debt items"""

        # Run scan first
        scan_results = self.scan()
        debt_items = scan_results["debt_items"]

        # Calculate impact scores
        for item in debt_items:
            item["impact_score"] = self.calculate_impact_score(item, business_context)

        # Sort by strategy
        if prioritization_strategy == "impact_effort_ratio":
            debt_items.sort(
                key=lambda x: x["impact_score"] / self.parse_effort(x.get("effort_estimate", "2-4 hours"))[0],
                reverse=True
            )
        elif prioritization_strategy == "severity_first":
            severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            debt_items.sort(
                key=lambda x: severity_order.get(x.get("severity", "medium"), 2),
                reverse=True
            )

        # Assign ranks and priorities
        prioritized = []
        for rank, item in enumerate(debt_items[:50], 1):
            prioritized.append({
                "rank": rank,
                "file": item["file"],
                "issue": item["description"],
                "impact_score": item["impact_score"],
                "effort_estimate": item.get("effort_estimate", "2-4 hours"),
                "priority": item.get("severity", "medium"),
                "impact_effort_ratio": round(
                    item["impact_score"] / self.parse_effort(item.get("effort_estimate", "2-4 hours"))[0],
                    3
                )
            })

        return {
            "success": True,
            "prioritized_debt": prioritized[:20],
            "quick_wins": [p for p in prioritized if self.parse_effort(p["effort_estimate"])[1] <= 2][:5]
        }

    def calculate_impact_score(self, item: Dict, business_context: Optional[Dict]) -> float:
        """Calculate business impact score for debt item"""
        score = 5.0  # Base score

        # Adjust by severity
        severity_weights = {"critical": 10, "high": 8, "medium": 5, "low": 2}
        score = severity_weights.get(item.get("severity", "medium"), 5)

        # Boost if in critical modules
        if business_context and "critical_modules" in business_context:
            for module in business_context["critical_modules"]:
                if module in item.get("file", ""):
                    score *= 1.5

        # Boost for high-churn + complexity
        if item.get("type") == "high_churn" and item.get("complexity", 0) > 20:
            score *= 1.3

        return round(score, 1)


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No context provided"
        }))
        return 1

    try:
        context = json.loads(sys.argv[1])
        operation = context.get("operation", "scan")
        project_dir = context.get("project_dir", ".")

        tracker = TechDebtTracker(project_dir)

        if operation == "scan":
            result = tracker.scan(
                languages=context.get("languages"),
                include_patterns=context.get("include_patterns"),
                exclude_patterns=context.get("exclude_patterns"),
                metrics=context.get("metrics")
            )

        elif operation == "calculate-metrics":
            result = tracker.calculate_metrics(
                metric_types=context.get("metric_types", ["sqale", "complexity"])
            )

        elif operation == "prioritize":
            result = tracker.prioritize(
                prioritization_strategy=context.get("prioritization_strategy", "impact_effort_ratio"),
                business_context=context.get("business_context")
            )

        else:
            result = {
                "success": False,
                "error": f"Unknown operation: {operation}"
            }

        print(json.dumps(result, indent=2))
        return 0

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
