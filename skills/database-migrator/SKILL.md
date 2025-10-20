---
name: database-migrator
description: Schema version control, migration script generation, rollback management
version: 1.0.0
tags: [database, migration, schema, versioning, sql]
---

# Database Migrator Skill

## Purpose

The Database Migrator Skill manages database schema evolution through version-controlled migrations. It generates migration scripts, tracks schema versions, validates migrations, and provides safe rollback capabilities.

**Key Capabilities:**
- Auto-generate migration scripts from schema changes
- Version control for database schemas
- Safe migration execution with validation
- Rollback management
- Multi-database support (PostgreSQL, MySQL, SQLite)
- Migration conflict detection

**Target Token Savings:** 70% (from ~2300 tokens to ~690 tokens)

## When to Use

- Creating database schema changes
- Deploying schema updates
- Rolling back migrations
- Syncing development/production schemas
- Generating migration scripts
- Validating schema compatibility

## Operations

### 1. generate-migration
Generates migration script from schema diff.

### 2. apply-migration
Applies pending migrations to database.

### 3. rollback
Rolls back last migration.

### 4. validate
Validates migration scripts for safety.

### 5. status
Shows current migration status.

## Scripts

```bash
# Generate migration
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation generate-migration \
  --name add_users_table

# Apply migrations
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation apply-migration \
  --db-url postgresql://localhost/mydb

# Rollback last migration
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation rollback \
  --db-url postgresql://localhost/mydb

# Check migration status
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation status \
  --db-url postgresql://localhost/mydb
```

## Configuration

```json
{
  "database-migrator": {
    "migrations_dir": "./migrations",
    "database_url": "postgresql://localhost/mydb",
    "auto_apply": false,
    "validate_before_apply": true,
    "create_backup": true,
    "rollback_on_error": true
  }
}
```

## Examples

### Example 1: Generate Migration

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation generate-migration \
  --name add_email_column
```

**Output:**
```json
{
  "success": true,
  "operation": "generate-migration",
  "migration_file": "migrations/001_add_email_column.sql",
  "version": "001",
  "execution_time_ms": 23
}
```

### Example 2: Apply Migrations

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation apply-migration \
  --db-url postgresql://localhost/mydb
```

**Output:**
```json
{
  "success": true,
  "operation": "apply-migration",
  "migrations_applied": 3,
  "current_version": "003",
  "execution_time_ms": 456
}
```

### Example 3: Rollback Migration

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation rollback \
  --db-url postgresql://localhost/mydb
```

**Output:**
```json
{
  "success": true,
  "operation": "rollback",
  "rolled_back": "003_add_index",
  "current_version": "002",
  "execution_time_ms": 234
}
```

### Example 4: Migration Status

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation status \
  --db-url postgresql://localhost/mydb
```

**Output:**
```json
{
  "success": true,
  "operation": "status",
  "current_version": "003",
  "pending_migrations": 2,
  "applied_migrations": 3,
  "execution_time_ms": 12
}
```

## Token Economics

**Without Skill:** ~2300 tokens
**With Skill:** ~690 tokens (70% savings)

## Success Metrics

- Execution time: <50ms for generation
- Migration success rate: >99.9%
- Zero data loss in rollbacks
- Schema validation: 100% accuracy

---

**Database Migrator Skill v1.0.0** - Safe database schema evolution
