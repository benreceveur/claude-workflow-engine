# Performance Profiler Skill - Usage Examples

## Example 1: CPU Profiling

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-cpu \
  --app-file app.py
```

**Output:** CPU hotspots and optimization recommendations

## Example 2: Memory Profiling

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-memory \
  --app-file app.py
```

**Output:** Memory usage analysis and leak detection

## Example 3: Query Analysis

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-queries \
  --log-file queries.log
```

**Output:** Slow query identification and optimization suggestions

## Example 4: Comprehensive Analysis

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-all \
  --app-file app.py
```

**Output:** Complete performance report with overall score
