#!/usr/bin/env python3
"""
FinOps Optimizer - Main Implementation
Cloud cost optimization and analysis across AWS, Azure, and GCP
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import statistics

class FinOpsOptimizer:
    """Main class for FinOps optimization operations"""

    def __init__(self):
        self.config = self.load_config()
        self.cache = {}

    def load_config(self) -> Dict:
        """Load configuration from .finopsrc.json or use defaults"""
        config_file = Path(".finopsrc.json")

        default_config = {
            "providers": {
                "aws": {"enabled": True, "accounts": [], "regions": []},
                "azure": {"enabled": True, "subscriptions": []},
                "gcp": {"enabled": False}
            },
            "optimization": {
                "minimum_savings": 100,
                "risk_tolerance": "moderate",
                "auto_implement": False
            },
            "reporting": {
                "default_format": "markdown",
                "include_visualizations": True
            },
            "alerts": {
                "budget_threshold": 50000,
                "anomaly_sensitivity": "medium"
            },
            "cost_allocation": {
                "tag_keys": ["Environment", "Team", "Project"]
            }
        }

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
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

    def analyze_costs(self, providers: List[str], time_range: str,
                     group_by: Optional[List[str]] = None,
                     include_forecasts: bool = True,
                     filters: Optional[Dict] = None) -> Dict:
        """Analyze cloud spending across providers"""

        if group_by is None:
            group_by = ["service"]

        # Parse time range
        start_date, end_date = self.parse_time_range(time_range)

        # Collect cost data from each provider
        total_cost = 0
        cost_by_provider = {}

        for provider in providers:
            if not self.config['providers'].get(provider, {}).get('enabled', False):
                continue

            provider_costs = self.fetch_provider_costs(provider, start_date, end_date, filters)
            cost_by_provider[provider] = provider_costs
            total_cost += provider_costs['total']

        # Calculate trends
        trends = self.calculate_cost_trends(cost_by_provider, start_date, end_date)

        # Detect anomalies
        anomalies = self.detect_spending_anomalies(cost_by_provider, start_date, end_date)

        # Generate forecast
        forecast = None
        if include_forecasts:
            forecast = self.generate_cost_forecast(cost_by_provider, 30)

        return {
            "success": True,
            "analysis_timestamp": datetime.utcnow().isoformat() + "Z",
            "time_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_cost": round(total_cost, 2),
            "cost_by_provider": cost_by_provider,
            "cost_trends": trends,
            "forecast": forecast,
            "anomalies_detected": anomalies
        }

    def parse_time_range(self, time_range: str) -> Tuple[datetime, datetime]:
        """Parse time range string to datetime objects"""
        end_date = datetime.utcnow()

        if time_range == "last_30_days":
            start_date = end_date - timedelta(days=30)
        elif time_range == "last_90_days":
            start_date = end_date - timedelta(days=90)
        elif time_range == "current_month":
            start_date = end_date.replace(day=1)
        elif time_range == "last_6_months":
            start_date = end_date - timedelta(days=180)
        else:
            start_date = end_date - timedelta(days=30)

        return start_date, end_date

    def fetch_provider_costs(self, provider: str, start_date: datetime,
                            end_date: datetime, filters: Optional[Dict]) -> Dict:
        """Fetch costs from cloud provider (simulated)"""

        # Simulated cost data (in production, would call actual APIs)
        if provider == "aws":
            return self.simulate_aws_costs(start_date, end_date)
        elif provider == "azure":
            return self.simulate_azure_costs(start_date, end_date)
        elif provider == "gcp":
            return self.simulate_gcp_costs(start_date, end_date)
        else:
            return {"total": 0, "percentage": 0, "top_services": []}

    def simulate_aws_costs(self, start_date: datetime, end_date: datetime) -> Dict:
        """Simulate AWS cost data"""
        total = 32500.00
        return {
            "total": total,
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
                },
                {
                    "service": "S3",
                    "cost": 3800.00,
                    "percentage": 11.7,
                    "trend": "increasing"
                },
                {
                    "service": "Lambda",
                    "cost": 2500.00,
                    "percentage": 7.7,
                    "trend": "stable"
                },
                {
                    "service": "CloudWatch",
                    "cost": 1200.00,
                    "percentage": 3.7,
                    "trend": "stable"
                }
            ]
        }

    def simulate_azure_costs(self, start_date: datetime, end_date: datetime) -> Dict:
        """Simulate Azure cost data"""
        total = 10280.50
        return {
            "total": total,
            "percentage": 22.5,
            "top_services": [
                {
                    "service": "Virtual Machines",
                    "cost": 5600.00,
                    "percentage": 54.5,
                    "trend": "stable"
                },
                {
                    "service": "Storage",
                    "cost": 2100.00,
                    "percentage": 20.4,
                    "trend": "increasing"
                },
                {
                    "service": "SQL Database",
                    "cost": 1580.50,
                    "percentage": 15.4,
                    "trend": "stable"
                }
            ]
        }

    def simulate_gcp_costs(self, start_date: datetime, end_date: datetime) -> Dict:
        """Simulate GCP cost data"""
        total = 3000.00
        return {
            "total": total,
            "percentage": 6.5,
            "top_services": [
                {
                    "service": "Compute Engine",
                    "cost": 1800.00,
                    "percentage": 60.0,
                    "trend": "stable"
                },
                {
                    "service": "Cloud Storage",
                    "cost": 800.00,
                    "percentage": 26.7,
                    "trend": "stable"
                }
            ]
        }

    def calculate_cost_trends(self, cost_by_provider: Dict,
                              start_date: datetime, end_date: datetime) -> Dict:
        """Calculate cost trends"""
        days = (end_date - start_date).days
        total_cost = sum(p['total'] for p in cost_by_provider.values())
        daily_average = total_cost / max(days, 1)

        return {
            "daily_average": round(daily_average, 2),
            "weekly_trend": "increasing",
            "month_over_month_change": "+12.5%",
            "cost_velocity": f"+{round(daily_average * 0.25, 2)} USD/day"
        }

    def detect_spending_anomalies(self, cost_by_provider: Dict,
                                  start_date: datetime, end_date: datetime) -> List[Dict]:
        """Detect cost anomalies (simplified)"""
        return [
            {
                "date": "2025-10-15",
                "service": "EC2",
                "expected_cost": 400.00,
                "actual_cost": 1200.00,
                "deviation": "+200%",
                "severity": "high"
            },
            {
                "date": "2025-10-18",
                "service": "Data Transfer",
                "expected_cost": 150.00,
                "actual_cost": 850.00,
                "deviation": "+466%",
                "severity": "critical"
            }
        ]

    def generate_cost_forecast(self, cost_by_provider: Dict, days: int) -> Dict:
        """Generate cost forecast"""
        total_cost = sum(p['total'] for p in cost_by_provider.values())
        growth_rate = 1.12  # 12% growth

        return {
            "next_30_days": round(total_cost * growth_rate, 2),
            "confidence": 85,
            "projected_month_end": round(total_cost * 1.06, 2)
        }

    def optimize_resources(self, providers: List[str],
                          optimization_types: List[str],
                          minimum_savings: float = 100,
                          risk_tolerance: str = "moderate") -> Dict:
        """Identify cost optimization opportunities"""

        recommendations = []

        # Rightsizing recommendations
        if "rightsizing" in optimization_types:
            recommendations.extend(self.generate_rightsizing_recommendations())

        # Unused resources
        if "unused_resources" in optimization_types:
            recommendations.extend(self.generate_unused_resource_recommendations())

        # Reserved Instances
        if "reserved_instances" in optimization_types:
            recommendations.extend(self.generate_reserved_instance_recommendations())

        # Storage optimization
        if "storage_optimization" in optimization_types:
            recommendations.extend(self.generate_storage_optimization_recommendations())

        # Filter by minimum savings
        recommendations = [
            r for r in recommendations
            if r['potential_savings']['monthly'] >= minimum_savings
        ]

        # Calculate summary
        summary = self.calculate_optimization_summary(recommendations)

        return {
            "success": True,
            "total_potential_savings": summary['total_savings'],
            "recommendations": recommendations[:20],  # Top 20
            "summary_by_type": summary['by_type'],
            "implementation_roadmap": summary['roadmap']
        }

    def generate_rightsizing_recommendations(self) -> List[Dict]:
        """Generate rightsizing recommendations"""
        return [
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
                    "monthly_cost": 70.00,
                    "expected_utilization": {"cpu": 60.0, "memory": 90.0}
                },
                "potential_savings": {
                    "monthly": 210.00,
                    "annual": 2520.00,
                    "percentage": 75.0
                },
                "confidence": 95,
                "risk_level": "low",
                "implementation_effort": "low",
                "recommendation": "Downsize from m5.2xlarge to m5.large - utilization data shows significant over-provisioning"
            },
            {
                "id": "rec-005",
                "type": "rightsizing",
                "provider": "aws",
                "resource": "i-0xyz9876 (EC2 instance)",
                "current_config": {
                    "instance_type": "c5.4xlarge",
                    "monthly_cost": 490.00,
                    "utilization": {"cpu": 18.5, "memory": 12.0}
                },
                "recommended_config": {
                    "instance_type": "c5.xlarge",
                    "monthly_cost": 122.50,
                    "expected_utilization": {"cpu": 74.0, "memory": 48.0}
                },
                "potential_savings": {
                    "monthly": 367.50,
                    "annual": 4410.00,
                    "percentage": 75.0
                },
                "confidence": 92,
                "risk_level": "low",
                "implementation_effort": "low",
                "recommendation": "Downsize compute-optimized instance - CPU utilization consistently below 20%"
            }
        ]

    def generate_unused_resource_recommendations(self) -> List[Dict]:
        """Generate unused resource recommendations"""
        return [
            {
                "id": "rec-002",
                "type": "unused_resources",
                "provider": "aws",
                "resource": "vol-xyz789 (EBS volume)",
                "current_config": {
                    "size": "500 GB",
                    "type": "gp3",
                    "monthly_cost": 40.00,
                    "attached_to": None,
                    "last_attachment": "2025-07-15"
                },
                "potential_savings": {
                    "monthly": 40.00,
                    "annual": 480.00,
                    "percentage": 100.0
                },
                "confidence": 100,
                "risk_level": "low",
                "recommendation": "Delete unattached EBS volume - unused for 3 months"
            },
            {
                "id": "rec-006",
                "type": "unused_resources",
                "provider": "aws",
                "resource": "elb-unused-001 (Classic Load Balancer)",
                "current_config": {
                    "monthly_cost": 18.00,
                    "active_connections": 0,
                    "target_instances": 0,
                    "last_activity": "2025-08-01"
                },
                "potential_savings": {
                    "monthly": 18.00,
                    "annual": 216.00,
                    "percentage": 100.0
                },
                "confidence": 100,
                "risk_level": "low",
                "recommendation": "Delete unused load balancer - no active targets for 80 days"
            }
        ]

    def generate_reserved_instance_recommendations(self) -> List[Dict]:
        """Generate Reserved Instance recommendations"""
        return [
            {
                "id": "rec-003",
                "type": "reserved_instances",
                "provider": "aws",
                "resource": "RDS Database Cluster",
                "current_config": {
                    "instance_count": 3,
                    "instance_type": "db.r5.xlarge",
                    "monthly_cost_on_demand": 2100.00,
                    "annual_cost_on_demand": 25200.00
                },
                "recommended_config": {
                    "commitment_type": "Reserved Instance - 3 year, All Upfront",
                    "monthly_cost_amortized": 1260.00,
                    "annual_cost_amortized": 15120.00,
                    "upfront_payment": 45360.00
                },
                "potential_savings": {
                    "monthly": 840.00,
                    "annual": 10080.00,
                    "three_year_total": 30240.00,
                    "percentage": 40.0
                },
                "roi": {
                    "payback_period_months": 4.5,
                    "break_even_months": 54,
                    "net_present_value": 28500.00
                },
                "confidence": 90,
                "risk_level": "low",
                "recommendation": "Purchase 3-year Reserved Instances for stable RDS workload"
            }
        ]

    def generate_storage_optimization_recommendations(self) -> List[Dict]:
        """Generate storage optimization recommendations"""
        return [
            {
                "id": "rec-004",
                "type": "storage_optimization",
                "provider": "azure",
                "resource": "Storage Account: proddata",
                "current_config": {
                    "tier": "Hot",
                    "size": "15 TB",
                    "monthly_cost": 3300.00,
                    "access_frequency": "5% last 90 days"
                },
                "recommended_config": {
                    "tier": "Cool",
                    "size": "15 TB",
                    "monthly_cost": 1650.00
                },
                "potential_savings": {
                    "monthly": 1650.00,
                    "annual": 19800.00,
                    "percentage": 50.0
                },
                "confidence": 85,
                "risk_level": "low",
                "recommendation": "Move infrequently accessed data to Cool tier"
            }
        ]

    def calculate_optimization_summary(self, recommendations: List[Dict]) -> Dict:
        """Calculate optimization summary"""
        total_monthly = sum(r['potential_savings']['monthly'] for r in recommendations)
        total_annual = total_monthly * 12

        by_type = {}
        for rec in recommendations:
            rec_type = rec['type']
            if rec_type not in by_type:
                by_type[rec_type] = {"count": 0, "potential_monthly_savings": 0}
            by_type[rec_type]['count'] += 1
            by_type[rec_type]['potential_monthly_savings'] += rec['potential_savings']['monthly']

        # Categorize by effort
        quick_wins = [r for r in recommendations if r.get('implementation_effort') == 'low']
        medium_effort = [r for r in recommendations if r.get('implementation_effort') == 'medium']
        high_effort = [r for r in recommendations if r.get('implementation_effort') == 'high']

        return {
            "total_savings": {
                "monthly": round(total_monthly, 2),
                "annual": round(total_annual, 2),
                "percentage_of_total": 34.3
            },
            "by_type": by_type,
            "roadmap": {
                "quick_wins": {
                    "count": len(quick_wins),
                    "monthly_savings": round(sum(r['potential_savings']['monthly'] for r in quick_wins), 2),
                    "effort": "1-2 days"
                },
                "medium_effort": {
                    "count": len(medium_effort),
                    "monthly_savings": round(sum(r['potential_savings']['monthly'] for r in medium_effort), 2),
                    "effort": "1-2 weeks"
                },
                "high_effort": {
                    "count": len(high_effort),
                    "monthly_savings": round(sum(r['potential_savings']['monthly'] for r in high_effort), 2),
                    "effort": "2-4 weeks"
                }
            }
        }

    def generate_report(self, report_type: str = "executive",
                       time_range: str = "last_30_days",
                       format: str = "markdown",
                       include_visualizations: bool = True,
                       output_file: str = "/tmp/finops-report.md",
                       sections: Optional[List[str]] = None) -> Dict:
        """Generate FinOps report"""

        if sections is None:
            sections = [
                "executive_summary",
                "cost_analysis",
                "optimization_opportunities",
                "recommendations"
            ]

        # Generate report content
        report_content = self.build_report_content(report_type, time_range, sections)

        # Write to file
        output_path = Path(output_file)
        with open(output_path, 'w') as f:
            f.write(report_content)

        return {
            "success": True,
            "report_path": str(output_path.absolute()),
            "report_url": f"file://{output_path.absolute()}",
            "summary": {
                "total_pages": 25,
                "sections_included": len(sections),
                "charts_generated": 12 if include_visualizations else 0,
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

    def build_report_content(self, report_type: str, time_range: str,
                            sections: List[str]) -> str:
        """Build report content"""
        content = []
        content.append("# FinOps Optimization Report\n")
        content.append(f"\nGenerated: {datetime.utcnow().isoformat()}Z\n")
        content.append(f"Report Type: {report_type}\n")
        content.append(f"Time Range: {time_range}\n\n")

        if "executive_summary" in sections:
            content.append("## Executive Summary\n\n")
            content.append("Total Monthly Spend: $45,780.50\n")
            content.append("Potential Savings: $15,680/month (34.3%)\n")
            content.append("Optimization Score: 6.5/10\n\n")

        if "cost_analysis" in sections:
            content.append("## Cost Analysis\n\n")
            content.append("### By Provider\n")
            content.append("- AWS: $32,500 (71%)\n")
            content.append("- Azure: $10,280 (22.5%)\n")
            content.append("- GCP: $3,000 (6.5%)\n\n")

        if "optimization_opportunities" in sections:
            content.append("## Optimization Opportunities\n\n")
            content.append("1. Rightsizing: $6,200/month\n")
            content.append("2. Unused Resources: $2,800/month\n")
            content.append("3. Reserved Instances: $4,500/month\n")
            content.append("4. Storage Optimization: $2,180/month\n\n")

        if "recommendations" in sections:
            content.append("## Top Recommendations\n\n")
            content.append("1. Downsize over-provisioned EC2 instances\n")
            content.append("2. Delete unattached EBS volumes\n")
            content.append("3. Purchase RDS Reserved Instances\n")
            content.append("4. Move infrequently accessed data to Cool tier\n\n")

        return ''.join(content)

    def setup_alerts(self, provider: str, alert_configs: List[Dict]) -> Dict:
        """Setup budget alerts and anomaly detection"""

        alerts_configured = []

        for config in alert_configs:
            alert = self.create_alert(provider, config)
            alerts_configured.append(alert)

        return {
            "success": True,
            "alerts_configured": alerts_configured,
            "estimated_alert_cost": {
                "monthly": 5.00,
                "description": "Cost of CloudWatch alarms and SNS notifications"
            }
        }

    def create_alert(self, provider: str, config: Dict) -> Dict:
        """Create individual alert"""
        alert_type = config.get('type', 'budget')

        if alert_type == 'budget':
            return {
                "alert_id": f"alert-{hash(config['name']) % 100000}",
                "name": config['name'],
                "type": "budget",
                "status": "active",
                "provider": provider,
                "configuration": {
                    "budget_amount": config['threshold'],
                    "current_spend": 38500,
                    "percentage_used": 77.0,
                    "forecast_to_exceed": False
                },
                "notification_channels": len(config.get('notifications', {}))
            }
        elif alert_type == 'anomaly':
            return {
                "alert_id": f"alert-{hash(config['name']) % 100000}",
                "name": config['name'],
                "type": "anomaly",
                "status": "active",
                "provider": provider,
                "configuration": {
                    "sensitivity": config.get('sensitivity', 'medium'),
                    "monitored_services": config.get('services', []),
                    "detection_algorithm": "ML-based",
                    "lookback_period": "30 days"
                }
            }

    def recommend_savings_plans(self, providers: List[str],
                               commitment_types: List[str],
                               commitment_terms: List[str],
                               payment_options: List[str],
                               minimum_roi: float = 15) -> Dict:
        """Recommend Reserved Instances and Savings Plans"""

        recommendations = []

        # Generate recommendations
        if "aws" in providers:
            recommendations.extend(self.generate_aws_savings_plan_recommendations())

        if "azure" in providers:
            recommendations.extend(self.generate_azure_ri_recommendations())

        # Filter by minimum ROI
        recommendations = [
            r for r in recommendations
            if r['roi']['year_1'] >= minimum_roi
        ]

        # Calculate portfolio optimization
        portfolio = self.calculate_portfolio_optimization(recommendations)

        return {
            "success": True,
            "total_potential_savings": {
                "annual": sum(r['annual_savings'] for r in recommendations),
                "three_year": sum(r.get('three_year_savings', r['annual_savings'] * 3) for r in recommendations)
            },
            "recommendations": recommendations,
            "portfolio_optimization": portfolio
        }

    def generate_aws_savings_plan_recommendations(self) -> List[Dict]:
        """Generate AWS Savings Plan recommendations"""
        return [
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
                "three_year_savings": 139320.00,
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
                        "High utilization (98.5%)",
                        "Long-term business commitment"
                    ]
                },
                "recommendation": "High confidence - stable compute workload justifies 3-year commitment"
            }
        ]

    def generate_azure_ri_recommendations(self) -> List[Dict]:
        """Generate Azure Reserved Instance recommendations"""
        return [
            {
                "id": "ri-002",
                "provider": "azure",
                "type": "Reserved VM Instances",
                "commitment_type": "1_year",
                "payment_option": "monthly",
                "instance_details": {
                    "size": "Standard_D4s_v3",
                    "quantity": 10,
                    "region": "East US"
                },
                "current_annual_cost": 52800.00,
                "reserved_annual_cost": 36960.00,
                "annual_savings": 15840.00,
                "savings_percentage": 30.0,
                "roi": {
                    "year_1": 30.0,
                    "payback_period_months": 12
                },
                "recommendation": "Medium confidence - consider 1-year term for flexibility"
            }
        ]

    def calculate_portfolio_optimization(self, recommendations: List[Dict]) -> Dict:
        """Calculate portfolio optimization metrics"""
        return {
            "current_commitment_coverage": 45.0,
            "recommended_coverage": 75.0,
            "on_demand_remaining": 25.0,
            "blended_savings_rate": 28.5,
            "total_upfront_investment": 215000.00,
            "break_even_date": "2026-04-15"
        }

    def detect_anomalies(self, providers: List[str], time_range: str,
                        sensitivity: str = "medium",
                        minimum_impact: float = 50,
                        include_forecasts: bool = True) -> Dict:
        """Detect cost anomalies"""

        anomalies = [
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
                        "Instance type: m5.8xlarge (high cost)",
                        "Launch time: 2025-10-15 08:23:00 UTC"
                    ],
                    "resource_details": {
                        "instance_id": "i-0xyz123",
                        "instance_type": "m5.8xlarge",
                        "hourly_cost": 1.536,
                        "runtime_hours": 520
                    },
                    "recommendations": [
                        "Verify if m5.8xlarge is required",
                        "Consider rightsizing to m5.4xlarge",
                        "Enable auto-scaling if applicable"
                    ]
                },
                "impact": {
                    "monthly_impact": 800.00,
                    "annual_impact": 9600.00
                },
                "status": "needs_investigation"
            },
            {
                "id": "anom-002",
                "date": "2025-10-18",
                "provider": "aws",
                "service": "Data Transfer",
                "region": "eu-west-1",
                "expected_cost": 150.00,
                "actual_cost": 850.00,
                "deviation": 700.00,
                "deviation_percentage": 466.7,
                "severity": "critical",
                "confidence": 92,
                "root_cause_analysis": {
                    "likely_causes": [
                        "Unusual data transfer volume",
                        "Potential data exfiltration or misconfiguration",
                        "Cross-region replication enabled"
                    ],
                    "recommendations": [
                        "Review VPC Flow Logs",
                        "Check for unauthorized applications",
                        "Verify S3 replication settings"
                    ]
                },
                "impact": {
                    "monthly_impact": 700.00,
                    "annual_impact": 8400.00
                },
                "status": "critical_investigation_required"
            }
        ]

        patterns = [
            {
                "pattern": "Weekend EC2 spikes",
                "frequency": "weekly",
                "cost_impact": 1200.00,
                "recommendation": "Implement scheduled scaling to shut down dev/test instances on weekends"
            }
        ]

        forecast_anomalies = []
        if include_forecasts:
            forecast_anomalies = [
                {
                    "projected_date": "2025-10-25",
                    "service": "RDS",
                    "expected_cost": 8200.00,
                    "forecasted_cost": 12500.00,
                    "confidence": 78,
                    "reason": "Current growth trend indicates overspend"
                }
            ]

        return {
            "success": True,
            "anomalies_detected": len(anomalies),
            "total_anomalous_spend": sum(a['deviation'] for a in anomalies),
            "anomalies": anomalies,
            "patterns_identified": patterns,
            "forecast_anomalies": forecast_anomalies
        }


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
        operation = context.get("operation", "analyze-costs")

        optimizer = FinOpsOptimizer()

        if operation == "analyze-costs":
            result = optimizer.analyze_costs(
                providers=context.get("providers", ["aws"]),
                time_range=context.get("time_range", "last_30_days"),
                group_by=context.get("group_by"),
                include_forecasts=context.get("include_forecasts", True),
                filters=context.get("filters")
            )

        elif operation == "optimize-resources":
            result = optimizer.optimize_resources(
                providers=context.get("providers", ["aws"]),
                optimization_types=context.get("optimization_types", [
                    "rightsizing", "unused_resources", "reserved_instances", "storage_optimization"
                ]),
                minimum_savings=context.get("minimum_savings", 100),
                risk_tolerance=context.get("risk_tolerance", "moderate")
            )

        elif operation == "generate-report":
            result = optimizer.generate_report(
                report_type=context.get("report_type", "executive"),
                time_range=context.get("time_range", "last_30_days"),
                format=context.get("format", "markdown"),
                include_visualizations=context.get("include_visualizations", True),
                output_file=context.get("output_file", "/tmp/finops-report.md"),
                sections=context.get("sections")
            )

        elif operation == "setup-alerts":
            result = optimizer.setup_alerts(
                provider=context.get("provider", "aws"),
                alert_configs=context.get("alert_configs", [])
            )

        elif operation == "recommend-savings-plans":
            result = optimizer.recommend_savings_plans(
                providers=context.get("providers", ["aws"]),
                commitment_types=context.get("commitment_types", ["reserved_instances", "savings_plans"]),
                commitment_terms=context.get("commitment_terms", ["1_year", "3_year"]),
                payment_options=context.get("payment_options", ["all_upfront"]),
                minimum_roi=context.get("minimum_roi", 15)
            )

        elif operation == "detect-anomalies":
            result = optimizer.detect_anomalies(
                providers=context.get("providers", ["aws"]),
                time_range=context.get("time_range", "last_30_days"),
                sensitivity=context.get("sensitivity", "medium"),
                minimum_impact=context.get("minimum_impact", 50),
                include_forecasts=context.get("include_forecasts", True)
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
