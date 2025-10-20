---
name: performance-profiler
description: CPU/memory profiling, database query optimization, and performance analysis
version: 1.0.0
tags: [performance, profiling, optimization, cpu, memory, database]
---

# Performance Profiler Skill

## Purpose

The Performance Profiler Skill analyzes application performance, identifies bottlenecks, profiles CPU and memory usage, and optimizes database queries. It provides actionable insights to improve application speed and resource utilization.

**Key Capabilities:**
- CPU profiling and hotspot detection
- Memory profiling and leak detection
- Database query analysis and optimization
- Response time analysis
- Resource utilization monitoring
- Performance regression detection

**Target Token Savings:** 65% (from ~2200 tokens to ~770 tokens)

## When to Use

- Investigating slow performance
- Optimizing application speed
- Detecting memory leaks
- Analyzing database queries
- Profiling API endpoints
- Monitoring resource usage
- Finding performance bottlenecks
- Regression testing

## Operations

### 1. profile-cpu
Profiles CPU usage and identifies performance hotspots.

### 2. profile-memory
Analyzes memory usage and detects leaks.

### 3. analyze-queries
Examines database queries for optimization opportunities.

### 4. profile-api
Profiles API endpoint response times.

### 5. analyze-all
Comprehensive performance analysis.

## Scripts

```bash
# CPU profiling
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-cpu \
  --app-file app.py

# Memory profiling
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-memory \
  --app-file app.py

# Query analysis
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-queries \
  --log-file queries.log

# Comprehensive analysis
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-all \
  --app-file app.py
```

## Configuration

```json
{
  "performance-profiler": {
    "cpu": {
      "threshold_percent": 80,
      "sample_interval": 0.01
    },
    "memory": {
      "threshold_mb": 100,
      "track_allocations": true
    },
    "queries": {
      "slow_query_threshold_ms": 100,
      "max_queries": 1000
    }
  }
}
```

## Examples

### Example 1: CPU Profiling

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-cpu \
  --app-file app.py
```

**Output:**
```json
{
  "success": true,
  "operation": "profile-cpu",
  "total_time": 2.45,
  "hotspots": [
    {
      "function": "process_data",
      "time_percent": 45.2,
      "calls": 1000,
      "recommendation": "Consider caching or optimization"
    }
  ],
  "execution_time_ms": 234
}
```

### Example 2: Memory Profiling

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation profile-memory \
  --app-file app.py
```

**Output:**
```json
{
  "success": true,
  "operation": "profile-memory",
  "peak_memory_mb": 156.7,
  "leaks_detected": 2,
  "recommendations": [
    "Large list allocation in loop - consider generator",
    "Unclosed database connections detected"
  ],
  "execution_time_ms": 456
}
```

### Example 3: Query Analysis

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-queries \
  --log-file queries.log
```

**Output:**
```json
{
  "success": true,
  "operation": "analyze-queries",
  "total_queries": 458,
  "slow_queries": 12,
  "recommendations": [
    {
      "query": "SELECT * FROM users WHERE email = ...",
      "time_ms": 245,
      "issue": "Missing index on email column",
      "recommendation": "CREATE INDEX idx_users_email ON users(email)"
    }
  ],
  "execution_time_ms": 123
}
```

### Example 4: Comprehensive Analysis

```bash
python ~/.claude/skills/performance-profiler/scripts/main.py \
  --operation analyze-all \
  --app-file app.py
```

**Output:**
```json
{
  "success": true,
  "operation": "analyze-all",
  "summary": {
    "cpu_hotspots": 3,
    "memory_issues": 2,
    "slow_queries": 5,
    "overall_score": 72
  },
  "execution_time_ms": 1234
}
```

## Token Economics

**Without Skill:** ~2200 tokens (manual analysis)
**With Skill:** ~770 tokens (65% savings)

## Success Metrics

- Execution time: <500ms for profiling
- Hotspot detection: >95% accuracy
- Memory leak detection: >90% accuracy
- Query optimization: 50-80% performance improvement

---

**Performance Profiler Skill v1.0.0** - Optimizing application performance
