#!/usr/bin/env node

/**
 * Enhanced Agent Dispatcher v2.0
 * Intelligent agent selection with comprehensive role mapping
 * Replaces the basic keyword matching with sophisticated confidence scoring
 */


class EnhancedAgentDispatcher {
  constructor() {
    this.roleMapping = this.loadRoleMapping();
    this.memoryContext = null;
    this.debugMode = process.env.AGENT_DEBUG === 'true';
    this.repoIntegrator = null;
    this.learningSystem = null;
    this.initializeIntegrations();
  }

  initializeIntegrations() {
    // Initialize repository integration if available
    try {
      const RepoAgentIntegrator = require('./integrate-repo-agents.js');
      this.repoIntegrator = new RepoAgentIntegrator();
    } catch (error) {
      // Repository integration not available
    }

    // Initialize learning system if available
    try {
      const AgentLearningSystem = require('./agent-learning-system.js');
      this.learningSystem = new AgentLearningSystem();
    } catch (error) {
      // Learning system not available
    }
  }

  loadRoleMapping() {
    return {
      // Development & Engineering
      'frontend-engineer': {
        confidence_boosters: [
          'react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html',
          'component', 'ui', 'interface', 'responsive', 'frontend', 'client'
        ],
        mandatory_triggers: [
          'create.*component', 'build.*ui', 'style.*page', 'frontend.*issue'
        ],
        context_indicators: ['src/components', 'public/', 'assets/', '.jsx', '.tsx', '.vue']
      },

      'backend-engineer': {
        confidence_boosters: [
          'api', 'server', 'database', 'backend', 'endpoint', 'service',
          'authentication', 'authorization', 'middleware', 'orm'
        ],
        mandatory_triggers: [
          'create.*api', 'build.*server', 'database.*design', 'backend.*service'
        ],
        context_indicators: ['controllers/', 'models/', 'routes/', '.py', '.go', '.java']
      },

      'devops-engineer': {
        confidence_boosters: [
          'deploy', 'docker', 'kubernetes', 'ci/cd', 'pipeline', 'infrastructure',
          'monitoring', 'logging', 'aws', 'cloud', 'terraform', 'ansible'
        ],
        mandatory_triggers: [
          'deploy.*application', 'setup.*pipeline', 'configure.*infrastructure'
        ],
        context_indicators: ['Dockerfile', 'docker-compose.yml', '.github/workflows', 'terraform/']
      },

      'security-engineer': {
        confidence_boosters: [
          'security', 'vulnerability', 'authentication', 'authorization', 'encryption',
          'audit', 'compliance', 'penetration', 'threat', 'risk'
        ],
        mandatory_triggers: [
          'security.*audit', 'fix.*vulnerability', 'implement.*auth'
        ],
        context_indicators: ['security/', 'auth/', '.env.example']
      },

      // Data & Analytics
      'data-engineer': {
        confidence_boosters: [
          'data', 'etl', 'pipeline', 'warehouse', 'analytics', 'bigquery',
          'spark', 'kafka', 'airflow', 'dbt'
        ],
        mandatory_triggers: [
          'build.*pipeline', 'process.*data', 'setup.*warehouse'
        ],
        context_indicators: ['dags/', 'sql/', 'data/', '.sql']
      },

      'data-scientist': {
        confidence_boosters: [
          'machine learning', 'model', 'algorithm', 'prediction', 'analysis',
          'visualization', 'statistics', 'pandas', 'numpy', 'sklearn'
        ],
        mandatory_triggers: [
          'train.*model', 'analyze.*data', 'build.*prediction'
        ],
        context_indicators: ['notebooks/', 'models/', '.ipynb', '.py']
      }
    };
  }

  async analyzeInput(input, context = {}) {
    const analysis = {
      input: input.toLowerCase(),
      context: context,
      agent_scores: {},
      recommendations: [],
      confidence_threshold: 0.7,
      mandatory_agent: null,
      final_recommendation: null
    };

    // Apply repository-specific boosts if available
    if (this.repoIntegrator) {
      try {
        // Get repository context for enhancement
        const repo = this.repoIntegrator.getCurrentRepository();
        analysis.repository_context = repo;
      } catch (error) {
        // Repository integration not available
        analysis.repository_context = null;
      }
    }

    // Calculate scores for each agent
    Object.keys(this.roleMapping).forEach(agent => {
      const score = this.calculateAgentScore(analysis.input, agent, context);
      analysis.agent_scores[agent] = score;
    });

    // Apply repository-specific score enhancements
    if (this.repoIntegrator && analysis.repository_context) {
      try {
        analysis.agent_scores = this.repoIntegrator.enhanceAgentScores(analysis.input, analysis.agent_scores);
      } catch (error) {
        // Enhancement failed, use base scores
      }
    }

    // Check for mandatory triggers
    analysis.mandatory_agent = this.checkMandatoryTriggers(analysis.input);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Select final recommendation
    analysis.final_recommendation = this.selectFinalRecommendation(analysis);

    // Log to learning system if available
    if (this.learningSystem && typeof this.learningSystem.logDispatch === 'function') {
      try {
        this.learningSystem.logDispatch(input, analysis.final_recommendation, context);
      } catch (error) {
        // Learning system logging failed, continue
      }
    }

    return analysis;
  }

  calculateAgentScore(input, agent, context = {}) {
    const role = this.roleMapping[agent];
    let score = 0;

    // Base confidence from keyword matching
    const keywordMatches = role.confidence_boosters.filter(keyword =>
      input.includes(keyword.toLowerCase())
    ).length;

    score += (keywordMatches / role.confidence_boosters.length) * 0.6;

    // Context indicators (file paths, project structure)
    if (context.filePaths) {
      const contextMatches = role.context_indicators.filter(indicator =>
        context.filePaths.some(filePath => filePath.includes(indicator))
      ).length;

      score += (contextMatches / role.context_indicators.length) * 0.3;
    }

    // Repository-specific boosts are now handled separately in enhanceAgentScores

    return Math.min(score, 1.0); // Cap at 1.0
  }

  checkMandatoryTriggers(input) {
    for (const [agent, role] of Object.entries(this.roleMapping)) {
      for (const trigger of role.mandatory_triggers) {
        const regex = new RegExp(trigger, 'i');
        if (regex.test(input)) {
          return agent;
        }
      }
    }
    return null;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Sort agents by score
    const sortedAgents = Object.entries(analysis.agent_scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Top 3

    sortedAgents.forEach(([agent, score]) => {
      if (score > analysis.confidence_threshold || agent === analysis.mandatory_agent) {
        recommendations.push({
          agent: agent,
          confidence: score,
          reason: this.generateReason(agent, score, analysis.mandatory_agent === agent),
          mandatory: analysis.mandatory_agent === agent
        });
      }
    });

    return recommendations;
  }

  selectFinalRecommendation(analysis) {
    // If there's a mandatory agent, use it
    if (analysis.mandatory_agent) {
      return {
        agent: analysis.mandatory_agent,
        confidence: 1.0,
        reason: 'Mandatory trigger detected',
        mandatory: true
      };
    }

    // Otherwise, use the highest scoring agent above threshold
    const topRecommendation = analysis.recommendations[0];
    return topRecommendation || {
      agent: 'general-assistant',
      confidence: 0.5,
      reason: 'No specific agent confidence threshold met',
      mandatory: false
    };
  }

  generateReason(agent, score, isMandatory) {
    if (isMandatory) {
      return `Mandatory trigger detected for ${agent}`;
    }

    if (score > 0.8) {
      return `High confidence match (${(score * 100).toFixed(1)}%) for ${agent}`;
    } else if (score > 0.6) {
      return `Good match (${(score * 100).toFixed(1)}%) for ${agent}`;
    } else {
      return `Moderate match (${(score * 100).toFixed(1)}%) for ${agent}`;
    }
  }

  async dispatch(input, context = {}) {
    const analysis = await this.analyzeInput(input, context);

    if (this.debugMode) {
      console.log('🔍 Agent Dispatch Analysis:', JSON.stringify(analysis, null, 2));
    }

    return {
      recommended_agent: analysis.final_recommendation.agent,
      confidence: analysis.final_recommendation.confidence,
      reasoning: analysis.final_recommendation.reason,
      mandatory: analysis.final_recommendation.mandatory,
      alternatives: analysis.recommendations.slice(1),
      full_analysis: this.debugMode ? analysis : undefined
    };
  }

  // CLI interface
  async handleCLI(args) {
    const command = args[0];

    switch (command) {
      case 'analyze': {
        const input = args.slice(1).join(' ');
        if (!input) {
          console.error('Usage: enhanced-agent-dispatcher analyze "your input"');
          return;
        }

        const result = await this.dispatch(input);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'test': {
        await this.runTests();
        break;
      }

      case 'agents': {
        console.log('Available agents:');
        Object.keys(this.roleMapping).forEach(agent => {
          console.log(`  ${agent}`);
        });
        break;
      }

      default:
        console.log(`
Enhanced Agent Dispatcher v2.0

Usage:
  node enhanced-agent-dispatcher.js analyze "create a React component"
  node enhanced-agent-dispatcher.js test
  node enhanced-agent-dispatcher.js agents

Environment Variables:
  AGENT_DEBUG=true    Enable debug output
        `);
    }
  }

  async runTests() {
    const testCases = [
      'Create a React component for user authentication',
      'Deploy the application to AWS',
      'Fix a SQL injection vulnerability',
      'Build a data pipeline for analytics',
      'Train a machine learning model'
    ];

    console.log('🧪 Running Agent Dispatcher Tests\n');

    for (const testCase of testCases) {
      console.log(`Input: "${testCase}"`);
      const result = await this.dispatch(testCase);
      console.log(`Recommended: ${result.recommended_agent} (${(result.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`Reasoning: ${result.reasoning}\n`);
    }
  }
}

// Export for use as module
module.exports = EnhancedAgentDispatcher;

// CLI usage when run directly
if (require.main === module) {
  const dispatcher = new EnhancedAgentDispatcher();
  dispatcher.handleCLI(process.argv.slice(2));
}
