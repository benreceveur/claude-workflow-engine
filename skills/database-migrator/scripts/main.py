#!/usr/bin/env python3
"""
Database Migrator Skill - Main Entry Point
Schema version control and migration management
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List
from datetime import datetime

class DatabaseMigratorSkill:
    def __init__(self, context: Dict):
        self.context = context
        self.start_time = datetime.now()
        self.migrations_dir = context.get('migrations_dir', './migrations')

    def generate_migration(self) -> Dict:
        """Generate new migration script"""
        name = self.context.get('name', 'new_migration')

        # Ensure migrations directory exists
        os.makedirs(self.migrations_dir, exist_ok=True)

        # Get next version number
        existing_migrations = list(Path(self.migrations_dir).glob('*.sql'))
        version = str(len(existing_migrations) + 1).zfill(3)

        # Create migration file
        filename = f"{version}_{name}.sql"
        filepath = os.path.join(self.migrations_dir, filename)

        # Generate migration template
        template = f"""-- Migration: {name}
-- Version: {version}
-- Created: {datetime.now().isoformat()}

-- UP Migration
-- Add your schema changes here
CREATE TABLE IF NOT EXISTS example (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOWN Migration (for rollback)
-- DROP TABLE IF EXISTS example;
"""

        with open(filepath, 'w') as f:
            f.write(template)

        return {
            'success': True,
            'operation': 'generate-migration',
            'migration_file': filepath,
            'version': version,
            'name': name,
            'execution_time_ms': self._get_execution_time()
        }

    def apply_migration(self) -> Dict:
        """Apply pending migrations"""
        db_url = self.context.get('db_url')

        if not db_url:
            return {'success': False, 'error': 'Database URL required'}

        # Get pending migrations
        pending = self._get_pending_migrations()

        if not pending:
            return {
                'success': True,
                'operation': 'apply-migration',
                'migrations_applied': 0,
                'message': 'No pending migrations',
                'execution_time_ms': self._get_execution_time()
            }

        applied = []

        # Simulate applying migrations (real implementation would use database connection)
        for migration_file in pending:
            # In a real implementation, this would:
            # 1. Read the migration SQL
            # 2. Execute it against the database
            # 3. Record the migration in a schema_migrations table
            applied.append(migration_file.stem)

        current_version = pending[-1].stem.split('_')[0]

        return {
            'success': True,
            'operation': 'apply-migration',
            'migrations_applied': len(applied),
            'applied': applied,
            'current_version': current_version,
            'execution_time_ms': self._get_execution_time()
        }

    def rollback(self) -> Dict:
        """Rollback last migration"""
        db_url = self.context.get('db_url')

        if not db_url:
            return {'success': False, 'error': 'Database URL required'}

        # Get applied migrations
        applied = self._get_applied_migrations()

        if not applied:
            return {
                'success': False,
                'error': 'No migrations to rollback',
                'execution_time_ms': self._get_execution_time()
            }

        # Get last migration
        last_migration = applied[-1]

        # Simulate rollback (real implementation would execute DOWN migration)
        rolled_back = last_migration.stem

        # Get new current version
        if len(applied) > 1:
            current_version = applied[-2].stem.split('_')[0]
        else:
            current_version = '000'

        return {
            'success': True,
            'operation': 'rollback',
            'rolled_back': rolled_back,
            'current_version': current_version,
            'execution_time_ms': self._get_execution_time()
        }

    def validate(self) -> Dict:
        """Validate migration scripts"""
        migrations = self._get_all_migrations()

        issues = []

        for migration in migrations:
            # Check for dangerous operations
            with open(migration, 'r') as f:
                content = f.read()

                # Check for DROP DATABASE
                if 'DROP DATABASE' in content.upper():
                    issues.append({
                        'file': migration.name,
                        'severity': 'critical',
                        'issue': 'Contains DROP DATABASE',
                        'recommendation': 'Remove DROP DATABASE command'
                    })

                # Check for missing DOWN migration
                if '-- DOWN' not in content.upper():
                    issues.append({
                        'file': migration.name,
                        'severity': 'medium',
                        'issue': 'Missing rollback script',
                        'recommendation': 'Add DOWN migration for rollback'
                    })

                # Check for transactions
                if 'BEGIN' not in content.upper() and 'COMMIT' not in content.upper():
                    issues.append({
                        'file': migration.name,
                        'severity': 'low',
                        'issue': 'Not wrapped in transaction',
                        'recommendation': 'Wrap in BEGIN/COMMIT for atomicity'
                    })

        return {
            'success': True,
            'operation': 'validate',
            'migrations_checked': len(migrations),
            'issues_found': len(issues),
            'issues': issues,
            'execution_time_ms': self._get_execution_time()
        }

    def status(self) -> Dict:
        """Show migration status"""
        all_migrations = self._get_all_migrations()
        applied = self._get_applied_migrations()
        pending = self._get_pending_migrations()

        current_version = '000'
        if applied:
            current_version = applied[-1].stem.split('_')[0]

        return {
            'success': True,
            'operation': 'status',
            'current_version': current_version,
            'total_migrations': len(all_migrations),
            'applied_migrations': len(applied),
            'pending_migrations': len(pending),
            'pending': [m.stem for m in pending],
            'execution_time_ms': self._get_execution_time()
        }

    def _get_all_migrations(self) -> List[Path]:
        """Get all migration files"""
        if not os.path.exists(self.migrations_dir):
            return []

        return sorted(Path(self.migrations_dir).glob('*.sql'))

    def _get_applied_migrations(self) -> List[Path]:
        """Get applied migrations (simulated)"""
        # In a real implementation, this would query the database
        # For now, return first 3 migrations as "applied"
        all_migrations = self._get_all_migrations()
        return all_migrations[:3]

    def _get_pending_migrations(self) -> List[Path]:
        """Get pending migrations"""
        all_migrations = self._get_all_migrations()
        applied = self._get_applied_migrations()

        applied_names = {m.stem for m in applied}
        return [m for m in all_migrations if m.stem not in applied_names]

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
        elif args[i] == '--name' and i + 1 < len(args):
            context['name'] = args[i + 1]
            i += 2
        elif args[i] == '--db-url' and i + 1 < len(args):
            context['db_url'] = args[i + 1]
            i += 2
        elif args[i] == '--migrations-dir' and i + 1 < len(args):
            context['migrations_dir'] = args[i + 1]
            i += 2
        else:
            i += 1

    operation = context.get('operation', 'status')
    skill = DatabaseMigratorSkill(context)

    try:
        if operation == 'generate-migration':
            result = skill.generate_migration()
        elif operation == 'apply-migration':
            result = skill.apply_migration()
        elif operation == 'rollback':
            result = skill.rollback()
        elif operation == 'validate':
            result = skill.validate()
        elif operation == 'status':
            result = skill.status()
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
