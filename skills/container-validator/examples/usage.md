# Container Validator Skill - Usage Examples

## Example 1: Validate Dockerfile

```bash
python ~/.claude/skills/container-validator/scripts/main.py \
  --operation validate-dockerfile \
  --file Dockerfile
```

**Output:** Dockerfile validation with security and best practice issues

## Example 2: Validate Kubernetes Manifests

```bash
python ~/.claude/skills/container-validator/scripts/main.py \
  --operation validate-k8s \
  --dir ./k8s
```

**Output:** Kubernetes manifest validation with resource and security checks

## Example 3: Validate Docker Compose

```bash
python ~/.claude/skills/container-validator/scripts/main.py \
  --operation validate-compose \
  --file docker-compose.yml
```

**Output:** Docker Compose validation with configuration recommendations

## Example 4: Comprehensive Validation

```bash
python ~/.claude/skills/container-validator/scripts/main.py \
  --operation validate-all \
  --dir .
```

**Output:** Complete container validation across all configuration files
