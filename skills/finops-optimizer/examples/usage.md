# FinOps Optimizer - Usage Examples

## Example 1: Multi-Cloud Cost Analysis

### Scenario
You want to analyze spending across AWS, Azure, and GCP for the last 30 days.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "analyze-costs",
  "providers": ["aws", "azure", "gcp"],
  "time_range": "last_30_days",
  "include_forecasts": true
}'
```

### Expected Output
```json
{
  "success": true,
  "analysis_timestamp": "2025-10-20T12:00:00Z",
  "time_range": {
    "start": "2025-09-20",
    "end": "2025-10-20"
  },
  "total_cost": 45780.50,
  "cost_by_provider": {
    "aws": {
      "total": 32500.00,
      "percentage": 71.0,
      "top_services": [
        {
          "service": "EC2",
          "cost": 12500.00,
          "percentage": 38.5,
          "trend": "increasing"
        },
        {
          "service": "RDS",
          "cost": 8200.00,
          "percentage": 25.2,
          "trend": "stable"
        }
      ]
    },
    "azure": {
      "total": 10280.50,
      "percentage": 22.5,
      "top_services": [
        {
          "service": "Virtual Machines",
          "cost": 5600.00,
          "percentage": 54.5
        }
      ]
    }
  },
  "cost_trends": {
    "daily_average": 1526.02,
    "weekly_trend": "increasing",
    "month_over_month_change": "+12.5%"
  },
  "forecast": {
    "next_30_days": 52000.00,
    "confidence": 85
  }
}
```

---

## Example 2: Identify Cost Optimization Opportunities

### Scenario
Your CFO wants to know where you can reduce cloud spending by at least $100/month per item.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "optimize-resources",
  "providers": ["aws", "azure"],
  "optimization_types": ["rightsizing", "unused_resources", "reserved_instances", "storage_optimization"],
  "minimum_savings": 100,
  "risk_tolerance": "moderate"
}'
```

### Expected Output
```json
{
  "success": true,
  "total_potential_savings": {
    "monthly": 15680.00,
    "annual": 188160.00,
    "percentage_of_total": 34.3
  },
  "recommendations": [
    {
      "id": "rec-001",
      "type": "rightsizing",
      "provider": "aws",
      "resource": "i-0abcd1234 (EC2 instance)",
      "current_config": {
        "instance_type": "m5.2xlarge",
        "monthly_cost": 280.00,
        "utilization": {"cpu": 15.2, "memory": 22.5}
      },
      "recommended_config": {
        "instance_type": "m5.large",
        "monthly_cost": 70.00
      },
      "potential_savings": {
        "monthly": 210.00,
        "annual": 2520.00,
        "percentage": 75.0
      },
      "confidence": 95,
      "risk_level": "low",
      "recommendation": "Downsize from m5.2xlarge to m5.large - utilization data shows significant over-provisioning"
    }
  ],
  "summary_by_type": {
    "rightsizing": {
      "count": 23,
      "potential_monthly_savings": 6200.00
    },
    "unused_resources": {
      "count": 47,
      "potential_monthly_savings": 2800.00
    },
    "reserved_instances": {
      "count": 8,
      "potential_monthly_savings": 4500.00
    }
  },
  "implementation_roadmap": {
    "quick_wins": {
      "count": 35,
      "monthly_savings": 3200.00,
      "effort": "1-2 days"
    }
  }
}
```

---

## Example 3: Generate Executive FinOps Report

### Scenario
You need to present cloud cost status to executive leadership.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "generate-report",
  "report_type": "executive",
  "time_range": "last_30_days",
  "format": "markdown",
  "include_visualizations": true,
  "output_file": "/tmp/finops-executive-report.md",
  "sections": ["executive_summary", "cost_analysis", "optimization_opportunities", "recommendations"]
}'
```

### Expected Output
```json
{
  "success": true,
  "report_path": "/tmp/finops-executive-report.md",
  "report_url": "file:///tmp/finops-executive-report.md",
  "summary": {
    "total_pages": 25,
    "sections_included": 4,
    "charts_generated": 12,
    "recommendations_count": 47
  },
  "key_metrics": {
    "total_monthly_spend": 45780.50,
    "projected_annual_spend": 549366.00,
    "potential_annual_savings": 188160.00,
    "current_waste_percentage": 34.3,
    "optimization_score": 6.5
  }
}
```

**Report Preview** (from `/tmp/finops-executive-report.md`):
```markdown
# FinOps Optimization Report

Generated: 2025-10-20T12:00:00Z
Report Type: executive
Time Range: last_30_days

## Executive Summary

Total Monthly Spend: $45,780.50
Potential Savings: $15,680/month (34.3%)
Optimization Score: 6.5/10

## Cost Analysis

### By Provider
- AWS: $32,500 (71%)
- Azure: $10,280 (22.5%)
- GCP: $3,000 (6.5%)

## Optimization Opportunities

1. Rightsizing: $6,200/month
2. Unused Resources: $2,800/month
3. Reserved Instances: $4,500/month
4. Storage Optimization: $2,180/month

## Top Recommendations

1. Downsize over-provisioned EC2 instances
2. Delete unattached EBS volumes
3. Purchase RDS Reserved Instances
4. Move infrequently accessed data to Cool tier
```

---

## Example 4: Setup Budget Alerts

### Scenario
You want to be notified when monthly spend exceeds $50k or unusual spending occurs.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "setup-alerts",
  "provider": "aws",
  "alert_configs": [
    {
      "name": "monthly-budget-alert",
      "type": "budget",
      "threshold": 50000,
      "period": "monthly",
      "notifications": {
        "email": ["finops-team@company.com"],
        "slack": "#finops-alerts"
      },
      "thresholds": [
        {"percentage": 80, "severity": "warning"},
        {"percentage": 90, "severity": "critical"},
        {"percentage": 100, "severity": "emergency"}
      ]
    },
    {
      "name": "anomaly-detection",
      "type": "anomaly",
      "sensitivity": "medium",
      "services": ["EC2", "RDS", "Lambda"],
      "notifications": {
        "email": ["devops-team@company.com"]
      }
    }
  ]
}'
```

### Expected Output
```json
{
  "success": true,
  "alerts_configured": [
    {
      "alert_id": "alert-12345",
      "name": "monthly-budget-alert",
      "type": "budget",
      "status": "active",
      "provider": "aws",
      "configuration": {
        "budget_amount": 50000,
        "current_spend": 38500,
        "percentage_used": 77.0,
        "forecast_to_exceed": false
      },
      "notification_channels": 2
    },
    {
      "alert_id": "alert-67890",
      "name": "anomaly-detection",
      "type": "anomaly",
      "status": "active",
      "provider": "aws",
      "configuration": {
        "sensitivity": "medium",
        "monitored_services": ["EC2", "RDS", "Lambda"],
        "detection_algorithm": "ML-based"
      }
    }
  ],
  "estimated_alert_cost": {
    "monthly": 5.00,
    "description": "Cost of CloudWatch alarms and SNS notifications"
  }
}
```

---

## Example 5: Reserved Instance / Savings Plan Analysis

### Scenario
You want to know if purchasing Reserved Instances or Savings Plans makes financial sense.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "recommend-savings-plans",
  "providers": ["aws", "azure"],
  "commitment_types": ["reserved_instances", "savings_plans"],
  "commitment_terms": ["1_year", "3_year"],
  "payment_options": ["all_upfront", "partial_upfront", "no_upfront"],
  "minimum_roi": 15
}'
```

### Expected Output
```json
{
  "success": true,
  "total_potential_savings": {
    "annual": 125400.00,
    "three_year": 376200.00
  },
  "recommendations": [
    {
      "id": "sp-001",
      "provider": "aws",
      "type": "Compute Savings Plan",
      "commitment_type": "3_year",
      "payment_option": "all_upfront",
      "hourly_commitment": 5.25,
      "upfront_cost": 138060.00,
      "current_annual_cost": 184500.00,
      "savings_plan_annual_cost": 138060.00,
      "annual_savings": 46440.00,
      "savings_percentage": 25.2,
      "roi": {
        "year_1": 33.6,
        "year_3": 100.8,
        "payback_period_months": 36,
        "net_present_value": 128500.00
      },
      "coverage": {
        "instances_covered": 25,
        "utilization_estimate": 98.5
      },
      "risk_assessment": {
        "level": "low",
        "factors": [
          "Stable workload for 18+ months",
          "High utilization (98.5%)"
        ]
      },
      "recommendation": "High confidence - stable compute workload justifies 3-year commitment"
    }
  ],
  "portfolio_optimization": {
    "current_commitment_coverage": 45.0,
    "recommended_coverage": 75.0,
    "blended_savings_rate": 28.5,
    "total_upfront_investment": 215000.00
  }
}
```

---

## Example 6: Detect Cost Anomalies

### Scenario
You notice unusual spending patterns and want to investigate.

### Command
```bash
node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
  "operation": "detect-anomalies",
  "providers": ["aws", "azure"],
  "time_range": "last_30_days",
  "sensitivity": "medium",
  "minimum_impact": 50,
  "include_forecasts": true
}'
```

### Expected Output
```json
{
  "success": true,
  "anomalies_detected": 8,
  "total_anomalous_spend": 4850.00,
  "anomalies": [
    {
      "id": "anom-001",
      "date": "2025-10-15",
      "provider": "aws",
      "service": "EC2",
      "region": "us-east-1",
      "expected_cost": 400.00,
      "actual_cost": 1200.00,
      "deviation": 800.00,
      "deviation_percentage": 200.0,
      "severity": "high",
      "confidence": 95,
      "root_cause_analysis": {
        "likely_causes": [
          "New instance launched: i-0xyz123",
          "Instance type: m5.8xlarge (high cost)"
        ],
        "recommendations": [
          "Verify if m5.8xlarge is required",
          "Consider rightsizing to m5.4xlarge"
        ]
      },
      "impact": {
        "monthly_impact": 800.00,
        "annual_impact": 9600.00
      }
    },
    {
      "id": "anom-002",
      "date": "2025-10-18",
      "provider": "aws",
      "service": "Data Transfer",
      "expected_cost": 150.00,
      "actual_cost": 850.00,
      "deviation": 700.00,
      "severity": "critical",
      "root_cause_analysis": {
        "likely_causes": [
          "Unusual data transfer volume",
          "Potential misconfiguration"
        ]
      }
    }
  ],
  "patterns_identified": [
    {
      "pattern": "Weekend EC2 spikes",
      "frequency": "weekly",
      "cost_impact": 1200.00,
      "recommendation": "Implement scheduled scaling"
    }
  ],
  "forecast_anomalies": [
    {
      "projected_date": "2025-10-25",
      "service": "RDS",
      "expected_cost": 8200.00,
      "forecasted_cost": 12500.00,
      "confidence": 78
    }
  ]
}
```

---

## Integration with Claude

### Natural Language Usage

**User**: "Analyze our cloud costs and find optimization opportunities"

**Claude**: I'll analyze your cloud spending across all providers and identify cost-saving opportunities using the finops-optimizer Skill.

[Executes: finops-optimizer analyze-costs + optimize-resources]

**Result**:
```
Cloud Cost Analysis (Last 30 Days):

Total Spend: $45,780.50
  - AWS: $32,500 (71%)
  - Azure: $10,280 (22.5%)
  - GCP: $3,000 (6.5%)

Trends:
  - Month-over-month: +12.5%
  - Daily average: $1,526
  - Forecast (next 30d): $52,000

Cost Optimization Opportunities:

Total Potential Savings: $15,680/month ($188k annually)

Top Recommendations:
1. Rightsizing (23 instances): $6,200/month
   - Example: Downsize m5.2xlarge to m5.large (15% CPU)
   - Effort: Low | Risk: Low

2. Unused Resources (47 items): $2,800/month
   - 35 unattached EBS volumes
   - 8 unused load balancers
   - Effort: Low | Risk: Low

3. Reserved Instances (8 recommendations): $4,500/month
   - RDS 3-year RI saves $840/month (40% discount)
   - ROI: 33.6% year 1
   - Effort: Medium | Risk: Low

4. Storage Optimization (12 items): $2,180/month
   - Move 15TB to Cool tier (5% access rate)
   - Effort: Low | Risk: Low

Quick Wins (1-2 days effort): $3,200/month

Implementation Roadmap:
  Week 1: Delete unused resources ($2,800/month)
  Week 2-3: Implement rightsizing ($6,200/month)
  Week 4: Purchase Reserved Instances ($4,500/month)

Total Implementation Time: 1 month
Expected Savings: $15,680/month (34.3% reduction)
```

---

## Advanced Usage

### Custom Configuration

Create `.finopsrc.json`:
```json
{
  "providers": {
    "aws": {
      "enabled": true,
      "accounts": ["prod-account", "dev-account"],
      "regions": ["us-east-1", "eu-west-1"]
    },
    "azure": {
      "enabled": true,
      "subscriptions": ["prod-subscription"]
    }
  },
  "optimization": {
    "minimum_savings": 50,
    "risk_tolerance": "conservative"
  },
  "alerts": {
    "budget_threshold": 40000,
    "anomaly_sensitivity": "high"
  }
}
```

---

## CI/CD Integration

### Weekly Cost Review Pipeline

```yaml
name: Weekly FinOps Review

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

jobs:
  finops-review:
    runs-on: ubuntu-latest
    steps:
      - name: Analyze Costs
        run: |
          node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
            "operation": "analyze-costs",
            "providers": ["aws", "azure"],
            "time_range": "last_7_days"
          }' > cost-analysis.json

      - name: Find Optimizations
        run: |
          node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
            "operation": "optimize-resources",
            "minimum_savings": 100
          }' > optimizations.json

      - name: Generate Report
        run: |
          node ~/.claude/memory/skill-executor.js execute finops-optimizer '{
            "operation": "generate-report",
            "output_file": "weekly-finops-report.md"
          }'

      - name: Send to Slack
        run: |
          # Post report to #finops-alerts
```

---

## Best Practices

### 1. Regular Reviews
```bash
# Weekly cost analysis
finops-optimizer analyze-costs --time-range=last_7_days

# Monthly optimization review
finops-optimizer optimize-resources --minimum-savings=100
```

### 2. Set Up Alerts Early
```bash
# Configure budget and anomaly alerts on day 1
finops-optimizer setup-alerts --provider=aws --budget=50000
```

### 3. Track Savings Over Time
```bash
# Generate monthly reports for stakeholders
finops-optimizer generate-report --report-type=executive
```

### 4. Balance Optimization with Risk
```bash
# Use conservative risk tolerance for production
finops-optimizer optimize-resources --risk-tolerance=conservative

# Use moderate/aggressive for dev/test
finops-optimizer optimize-resources --risk-tolerance=aggressive
```

---

## Troubleshooting

### Issue: "AWS credentials not found"
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
```

### Issue: "Insufficient permissions for Cost Explorer"
```bash
# Verify IAM permissions
aws ce get-cost-and-usage --help

# Required permissions:
# - ce:GetCostAndUsage
# - ce:GetCostForecast
# - ce:GetReservationUtilization
```

### Issue: "Cost data seems outdated"
```bash
# Cloud providers have 24-48 hour delay
# Use --include-estimates for real-time estimates
finops-optimizer analyze-costs --include-estimates
```
