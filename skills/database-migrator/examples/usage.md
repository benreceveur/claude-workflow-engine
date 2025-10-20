# Database Migrator Skill - Usage Examples

## Example 1: Generate Migration

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation generate-migration \
  --name add_email_column
```

**Output:** Creates new migration file with template

## Example 2: Apply Migrations

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation apply-migration \
  --db-url postgresql://localhost/mydb
```

**Output:** Applies all pending migrations

## Example 3: Rollback Migration

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation rollback \
  --db-url postgresql://localhost/mydb
```

**Output:** Rolls back last migration safely

## Example 4: Check Migration Status

```bash
python ~/.claude/skills/database-migrator/scripts/main.py \
  --operation status \
  --db-url postgresql://localhost/mydb
```

**Output:** Shows current version and pending migrations
