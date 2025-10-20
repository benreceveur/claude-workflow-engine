# AI Code Generator - Usage Examples

## Example 1: Generate Complete CRUD API

### Scenario
You need a full CRUD API for a User entity with authentication.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "generate-boilerplate",
  "type": "crud_api",
  "language": "typescript",
  "framework": "express",
  "entity": {
    "name": "User",
    "fields": [
      {"name": "id", "type": "uuid", "primary_key": true},
      {"name": "email", "type": "string", "unique": true, "required": true},
      {"name": "username", "type": "string", "unique": true, "required": true},
      {"name": "password", "type": "string", "required": true, "hashed": true},
      {"name": "created_at", "type": "datetime", "auto_now_add": true},
      {"name": "updated_at", "type": "datetime", "auto_now": true}
    ]
  },
  "options": {
    "include_validation": true,
    "include_authentication": true,
    "output_dir": "./generated"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "files_generated": [
    {
      "path": "./generated/models/User.ts",
      "type": "model",
      "lines_of_code": 45,
      "content": "import { Entity, PrimaryGeneratedColumn, Column... }"
    },
    {
      "path": "./generated/controllers/UserController.ts",
      "type": "controller",
      "lines_of_code": 120,
      "includes": ["CRUD operations", "validation", "authentication"]
    },
    {
      "path": "./generated/services/UserService.ts",
      "type": "service",
      "lines_of_code": 95
    },
    {
      "path": "./generated/routes/userRoutes.ts",
      "type": "routes",
      "lines_of_code": 30
    },
    {
      "path": "./generated/validators/userValidator.ts",
      "type": "validator",
      "lines_of_code": 40
    }
  ],
  "summary": {
    "total_files": 5,
    "total_lines_of_code": 330,
    "estimated_manual_time": "4-6 hours",
    "generation_time": "2.3 seconds",
    "time_saved": "3.5-5.5 hours"
  }
}
```

---

## Example 2: Generate Unit Tests

### Scenario
You wrote a UserService and need comprehensive unit tests.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "generate-tests",
  "source_file": "./src/services/UserService.ts",
  "test_framework": "jest",
  "coverage_target": 90,
  "test_types": ["unit", "integration"],
  "options": {
    "include_edge_cases": true,
    "include_error_scenarios": true,
    "mock_dependencies": true,
    "output_dir": "./tests"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "tests_generated": [
    {
      "path": "./tests/services/UserService.test.ts",
      "test_framework": "jest",
      "test_count": 24,
      "coverage_estimate": 92,
      "test_categories": {
        "happy_path": 8,
        "edge_cases": 10,
        "error_scenarios": 6
      },
      "content_preview": "import { UserService } from '../../src/services/UserService';\n\ndescribe('UserService', () => {\n  let userService: UserService;\n  \n  beforeEach(() => {\n    userService = new UserService();\n  });\n  \n  describe('createUser', () => {\n    it('should create a new user with valid data', async () => {\n      const userData = {\n        email: 'test@example.com',\n        username: 'testuser',\n        password: 'SecurePass123!'\n      };\n      \n      const result = await userService.createUser(userData);\n      \n      expect(result).toHaveProperty('id');\n      expect(result.email).toBe(userData.email);\n    });\n    \n    it('should throw error when email already exists', async () => {\n      const userData = { email: 'existing@example.com' };\n      \n      await expect(userService.createUser(userData))\n        .rejects.toThrow('Email already exists');\n    });\n  });\n});"
    }
  ],
  "summary": {
    "total_test_files": 1,
    "total_tests": 24,
    "estimated_coverage": 92,
    "estimated_manual_time": "3-5 hours",
    "generation_time": "1.8 seconds"
  }
}
```

---

## Example 3: Generate Synthetic Test Data

### Scenario
You need 10,000 realistic user records for load testing.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "generate-data",
  "schema": {
    "entity": "User",
    "fields": [
      {"name": "id", "type": "uuid"},
      {"name": "email", "type": "email"},
      {"name": "username", "type": "username"},
      {"name": "first_name", "type": "first_name"},
      {"name": "last_name", "type": "last_name"},
      {"name": "phone", "type": "phone"},
      {"name": "address", "type": "address"},
      {"name": "date_of_birth", "type": "date", "min": "1950-01-01", "max": "2005-12-31"},
      {"name": "account_balance", "type": "decimal", "min": 0, "max": 10000},
      {"name": "is_active", "type": "boolean"},
      {"name": "created_at", "type": "datetime"}
    ]
  },
  "count": 10000,
  "format": "json",
  "options": {
    "locale": "en_US",
    "ensure_unique": ["email", "username"],
    "output_file": "./test-data/users.json"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "data_generated": {
    "file_path": "./test-data/users.json",
    "format": "json",
    "record_count": 10000,
    "file_size": "23.0 MB",
    "data_preview": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "user0@example.com",
        "username": "user0",
        "first_name": "James",
        "last_name": "Thompson",
        "phone": "+1-555-234-5678",
        "address": "742 Main Street, City, State 12345",
        "date_of_birth": "1985-03-15",
        "account_balance": 3456.78,
        "is_active": true,
        "created_at": "2025-10-20T12:00:00Z"
      }
    ]
  },
  "data_quality": {
    "uniqueness": {
      "email": 100.0,
      "username": 100.0
    },
    "validation": {
      "email_format": "100% valid",
      "phone_format": "100% valid"
    }
  },
  "summary": {
    "generation_time": "3.2 seconds",
    "records_per_second": 3125,
    "privacy_safe": true
  }
}
```

---

## Example 4: Scaffold Complete Microservice

### Scenario
You need to create a new payment microservice from scratch.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "scaffold-service",
  "service_name": "payment-service",
  "language": "typescript",
  "framework": "nestjs",
  "architecture": "clean",
  "features": [
    "rest_api",
    "database",
    "message_queue",
    "logging",
    "monitoring",
    "authentication"
  ],
  "database": {
    "type": "postgresql",
    "orm": "typeorm"
  },
  "options": {
    "include_docker": true,
    "include_ci_cd": true,
    "include_tests": true,
    "output_dir": "./services/payment-service"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "service_scaffolded": {
    "service_name": "payment-service",
    "directory": "./services/payment-service",
    "structure": {
      "src/controllers": [],
      "src/services": [],
      "src/models": [],
      "src/middleware": [],
      "tests/unit": [],
      "tests/integration": []
    },
    "files_generated": 45,
    "total_lines_of_code": 3420,
    "estimated_manual_time": "2-3 days",
    "generation_time": "5.7 seconds"
  },
  "features_implemented": {
    "rest_api": {
      "endpoints": 8,
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "authentication": "JWT"
    },
    "database": {
      "type": "PostgreSQL",
      "orm": "TypeORM",
      "migrations": "Included"
    },
    "observability": {
      "logging": "Winston",
      "metrics": "Prometheus"
    },
    "testing": {
      "unit_tests": 24,
      "integration_tests": 12,
      "coverage_target": 80
    }
  },
  "next_steps": [
    "Install dependencies: npm install",
    "Configure environment: cp .env.example .env",
    "Start database: docker-compose up -d postgres",
    "Run migrations: npm run migration:run",
    "Start development server: npm run dev"
  ]
}
```

---

## Example 5: Generate API Client from OpenAPI Spec

### Scenario
You have an OpenAPI spec and need a typed TypeScript client.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "generate-client",
  "spec_source": "https://api.example.com/openapi.json",
  "language": "typescript",
  "client_library": "axios",
  "options": {
    "include_types": true,
    "include_validation": true,
    "include_retry_logic": true,
    "output_dir": "./generated/api-client"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "client_generated": {
    "spec_version": "3.0.0",
    "api_title": "Example API",
    "api_version": "1.0.0",
    "files_generated": [
      {
        "path": "./generated/api-client/index.ts",
        "type": "main_client",
        "lines_of_code": 150
      },
      {
        "path": "./generated/api-client/types.ts",
        "type": "typescript_types",
        "lines_of_code": 320,
        "types_count": 45
      },
      {
        "path": "./generated/api-client/api/users.ts",
        "type": "resource_api",
        "lines_of_code": 180,
        "methods_count": 8
      }
    ],
    "endpoints_covered": 32,
    "total_lines_of_code": 1250
  },
  "client_features": {
    "authentication": {
      "type": "Bearer Token"
    },
    "error_handling": {
      "custom_errors": true,
      "retry_logic": "Exponential backoff"
    },
    "type_safety": {
      "request_types": true,
      "response_types": true
    }
  },
  "usage_example": "import { ApiClient } from './generated/api-client';\n\nconst client = new ApiClient({\n  baseUrl: 'https://api.example.com',\n  token: 'your-auth-token'\n});\n\nconst user = await client.users.getById('123');",
  "summary": {
    "generation_time": "2.1 seconds",
    "estimated_manual_time": "6-8 hours"
  }
}
```

---

## Example 6: Generate Database Migration

### Scenario
You need to create a payments table with proper schema.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
  "operation": "generate-migration",
  "database": "postgresql",
  "migration_type": "create_table",
  "schema_change": {
    "table": "payments",
    "operation": "create",
    "columns": [
      {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
      {"name": "user_id", "type": "uuid", "nullable": false, "foreign_key": "users.id"},
      {"name": "amount", "type": "decimal(10,2)", "nullable": false},
      {"name": "currency", "type": "varchar(3)", "default": "USD"},
      {"name": "status", "type": "varchar(20)", "nullable": false},
      {"name": "created_at", "type": "timestamp", "default": "now()"}
    ],
    "indexes": [
      {"name": "idx_payments_user_id", "columns": ["user_id"]},
      {"name": "idx_payments_status", "columns": ["status"]}
    ]
  },
  "options": {
    "generate_rollback": true,
    "output_dir": "./migrations"
  }
}'
```

### Expected Output
```json
{
  "success": true,
  "migration_generated": {
    "migration_name": "20251020120000_create_payments_table",
    "files_generated": [
      {
        "path": "./migrations/20251020120000_create_payments_table.up.sql",
        "type": "migration_up",
        "content": "CREATE TABLE payments (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid NOT NULL,\n  amount decimal(10,2) NOT NULL,\n  currency varchar(3) DEFAULT USD,\n  status varchar(20) NOT NULL,\n  created_at timestamp DEFAULT now()\n);"
      },
      {
        "path": "./migrations/20251020120000_create_payments_table.down.sql",
        "type": "migration_down",
        "content": "DROP TABLE IF EXISTS payments;"
      }
    ]
  },
  "summary": {
    "tables_affected": 1,
    "columns_created": 6,
    "indexes_created": 2,
    "has_rollback": true,
    "generation_time": "0.8 seconds"
  },
  "next_steps": [
    "Review migration for correctness",
    "Test on development database",
    "Run migration: npm run migration:run"
  ]
}
```

---

## Integration with Claude

### Natural Language Usage

**User**: "Generate a complete CRUD API for Products with name, price, and inventory"

**Claude**: I'll generate a full CRUD API for Products using the ai-code-generator Skill.

[Executes: ai-code-generator generate-boilerplate]

**Result**:
```
Generated Product CRUD API:

Files Created (5):
✓ models/Product.ts (45 lines)
✓ controllers/ProductController.ts (120 lines)
✓ services/ProductService.ts (95 lines)
✓ routes/productRoutes.ts (30 lines)
✓ validators/productValidator.ts (40 lines)

Total: 330 lines of code
Time Saved: 3.5-5.5 hours
Generation Time: 2.3 seconds

Endpoints:
  POST   /api/products          - Create product
  GET    /api/products          - List all products (paginated)
  GET    /api/products/:id      - Get product by ID
  PUT    /api/products/:id      - Update product
  DELETE /api/products/:id      - Delete product

Features Included:
✓ Input validation (name, price, inventory)
✓ Authentication middleware
✓ Pagination & filtering
✓ Error handling
✓ TypeScript types

Next Steps:
1. Review generated code
2. npm install (dependencies)
3. Configure database
4. npm run migration:run
5. npm run dev

Ready to customize with business logic!
```

---

## Advanced Usage

### Custom Configuration

Create `.codegenrc.json`:
```json
{
  "language": "typescript",
  "framework": "nestjs",
  "test_framework": "jest",
  "code_style": {
    "indent": 2,
    "quotes": "single",
    "semicolons": true
  },
  "generation_preferences": {
    "include_comments": true,
    "include_validation": true,
    "include_error_handling": true,
    "include_logging": true
  },
  "templates": {
    "custom_templates_dir": "./templates"
  }
}
```

Then generate using custom config:
```bash
ai-code-generator generate-boilerplate --type=crud_api --entity=User
```

---

## CI/CD Integration

### Automated Code Generation Pipeline

```yaml
name: Generate Boilerplate

on:
  workflow_dispatch:
    inputs:
      entity_name:
        description: 'Entity name (e.g., Product)'
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Generate CRUD API
        run: |
          node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
            "operation": "generate-boilerplate",
            "type": "crud_api",
            "entity": {
              "name": "${{ github.event.inputs.entity_name }}"
            }
          }'

      - name: Generate Tests
        run: |
          node ~/.claude/memory/skill-executor.js execute ai-code-generator '{
            "operation": "generate-tests",
            "source_file": "./generated/services/${{ github.event.inputs.entity_name }}Service.ts"
          }'

      - name: Create PR
        run: |
          git checkout -b "feature/generated-${{ github.event.inputs.entity_name }}"
          git add .
          git commit -m "Generated boilerplate for ${{ github.event.inputs.entity_name }}"
          git push origin "feature/generated-${{ github.event.inputs.entity_name }}"
          gh pr create --title "Generated ${{ github.event.inputs.entity_name }} boilerplate"
```

---

## Best Practices

### 1. Review Generated Code
```bash
# Always review before committing
git diff --cached

# Run linter
npm run lint

# Run tests
npm test
```

### 2. Customize After Generation
```typescript
// Generated code
export class UserService {
  async create(data: CreateUserDto) {
    return this.repository.save(data);
  }
}

// Add custom business logic
export class UserService {
  async create(data: CreateUserDto) {
    // Custom validation
    if (await this.emailExists(data.email)) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    data.password = await bcrypt.hash(data.password, 10);

    // Call generated code
    return this.repository.save(data);
  }
}
```

### 3. Use Version Control
```bash
# Commit generated code separately
git add generated/
git commit -m "chore: generate User CRUD boilerplate"

# Then commit customizations
git add src/
git commit -m "feat: add custom user validation logic"
```

### 4. Document What Was Generated
```markdown
# User API

## Auto-Generated Components
- Model: `models/User.ts` (generated)
- Controller: `controllers/UserController.ts` (generated + customized)
- Service: `services/UserService.ts` (customized)
- Tests: `tests/UserService.test.ts` (generated)

## Custom Logic
- Email uniqueness validation
- Password hashing with bcrypt
- Role-based authorization
```

---

## Troubleshooting

### Issue: Generated code doesn't compile
**Solution**: Check TypeScript/Node versions
```bash
# Specify versions
ai-code-generator generate-boilerplate \
  --typescript-version=5.0 \
  --node-version=20
```

### Issue: Tests fail after generation
**Solution**: Update mock strategy
```json
{
  "test_options": {
    "mock_strategy": "manual",
    "include_setup_teardown": true
  }
}
```

### Issue: Need different code style
**Solution**: Configure in .codegenrc.json
```json
{
  "code_style": {
    "indent": 4,
    "quotes": "double",
    "semicolons": false
  }
}
```
