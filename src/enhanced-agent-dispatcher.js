#!/usr/bin/env node

/**
 * Enhanced Agent Dispatcher v3.0 - Phase 2
 * Comprehensive agent selection with ALL 76+ Claude Code agents
 * Intelligent matching with confidence scoring + Historical TF-IDF boosting
 */

const HistoricalBooster = require('./historical-booster.js');

class EnhancedAgentDispatcher {
  constructor(options = {}) {
    this.roleMapping = this.loadRoleMapping();
    this.memoryContext = null;
    this.debugMode = process.env.AGENT_DEBUG === 'true' || options.debug || false;
    this.repoIntegrator = null;
    this.learningSystem = null;

    // Phase 2: Historical boosting
    this.enableHistorical = options.enableHistorical !== false;
    this.historicalBooster = null;

    this.initializeIntegrations();
  }

  initializeIntegrations() {
    try {
      const RepoAgentIntegrator = require('./integrate-repo-agents.js');
      this.repoIntegrator = new RepoAgentIntegrator();
    } catch (error) {}

    try {
      const AgentLearningSystem = require('./agent-learning-system.js');
      this.learningSystem = new AgentLearningSystem();
    } catch (error) {}

    // Phase 2: Initialize historical booster
    if (this.enableHistorical) {
      try {
        this.historicalBooster = new HistoricalBooster({ debug: this.debugMode });
      } catch (error) {
        if (this.debugMode) {
          console.warn('Historical booster not available:', error.message);
        }
        this.historicalBooster = null;
      }
    }
  }

  loadRoleMapping() {
    return {
      // ===== CORE DEVELOPMENT AGENTS =====

      'general-purpose': {
        confidence_boosters: ['complex', 'multi-step', 'research', 'search', 'analyze', 'investigate'],
        mandatory_triggers: [],
        context_indicators: [],
        fallback: true // Used when no specific match
      },

      'frontend-developer': {
        confidence_boosters: [
          'react', 'vue', 'angular', 'svelte', 'jsx', 'tsx', 'component', 'ui', 'ux',
          'css', 'html', 'styling', 'responsive', 'accessibility', 'wcag', 'frontend',
          'client-side', 'dom', 'browser', 'webpack', 'vite', 'state management', 'hooks'
        ],
        mandatory_triggers: [
          'create.*component', 'build.*ui', 'react.*component', 'vue.*component',
          'frontend.*feature', 'client.*side'
        ],
        context_indicators: ['.jsx', '.tsx', '.vue', '.svelte', 'components/', 'src/']
      },

      'backend-architect': {
        confidence_boosters: [
          'api', 'rest', 'graphql', 'server', 'backend', 'microservices', 'architecture',
          'endpoint', 'routes', 'controllers', 'services', 'middleware', 'authentication',
          'authorization', 'database', 'schema', 'orm', 'sequelize', 'prisma', 'typeorm'
        ],
        mandatory_triggers: [
          'design.*api', 'build.*backend', 'create.*endpoint', 'rest.*api',
          'graphql.*schema', 'microservice.*architecture'
        ],
        context_indicators: ['.py', '.go', '.java', 'server/', 'api/', 'backend/']
      },

      'fullstack-developer': {
        confidence_boosters: [
          'full-stack', 'fullstack', 'end-to-end', 'frontend.*backend', 'complete.*application',
          'next.js', 'nuxt', 'sveltekit', 'remix', 'database.*ui', 'api.*component'
        ],
        mandatory_triggers: [
          'build.*full.*stack', 'complete.*application', 'frontend.*backend',
          'end.*to.*end.*app'
        ],
        context_indicators: ['src/', 'server/', 'api/', 'components/']
      },

      // ===== LANGUAGE SPECIALISTS =====

      'typescript-pro': {
        confidence_boosters: [
          'typescript', 'ts', 'type', 'interface', 'generic', 'type.*safety',
          'strict.*typing', 'conditional.*type', 'infer', 'utility.*type', 'tsconfig',
          'type.*error', 'improve.*type', 'fix.*type', 'type.*issue'
        ],
        mandatory_triggers: [
          'typescript.*optimization', 'complex.*type', 'generic.*constraint',
          'type.*system', 'ts.*migration', 'fix.*typescript', 'type.*error'
        ],
        context_indicators: ['.ts', '.tsx', 'tsconfig.json']
      },

      'javascript-pro': {
        confidence_boosters: [
          'javascript', 'js', 'es6', 'es2015', 'async', 'await', 'promise', 'closure',
          'prototype', 'event.*loop', 'node.js', 'npm', 'package.json'
        ],
        mandatory_triggers: [
          'javascript.*optimization', 'async.*pattern', 'js.*refactor'
        ],
        context_indicators: ['.js', '.mjs', 'package.json']
      },

      'python-pro': {
        confidence_boosters: [
          'python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy',
          'decorator', 'generator', 'asyncio', 'pip', 'requirements.txt', 'poetry'
        ],
        mandatory_triggers: [
          'python.*optimization', 'python.*refactor', 'django.*app', 'flask.*api'
        ],
        context_indicators: ['.py', 'requirements.txt', 'setup.py', 'pyproject.toml']
      },

      'rust-pro': {
        confidence_boosters: [
          'rust', 'cargo', 'ownership', 'lifetime', 'borrow', 'trait', 'unsafe',
          'zero.*cost', 'memory.*safety', 'concurrency', 'tokio', 'async.*rust'
        ],
        mandatory_triggers: [
          'rust.*implementation', 'memory.*safety', 'zero.*cost.*abstraction'
        ],
        context_indicators: ['.rs', 'Cargo.toml', 'Cargo.lock']
      },

      'c-pro': {
        confidence_boosters: [
          'c language', 'c code', 'pointer', 'malloc', 'free', 'struct',
          'embedded', 'kernel', 'system.*programming', 'memory.*management'
        ],
        mandatory_triggers: [
          'c.*optimization', 'memory.*management', 'pointer.*arithmetic',
          'embedded.*system'
        ],
        context_indicators: ['.c', '.h', 'Makefile']
      },

      // ===== DEVOPS & INFRASTRUCTURE =====

      'devops-engineer': {
        confidence_boosters: [
          'devops', 'deploy', 'deployment', 'ci/cd', 'pipeline', 'jenkins',
          'gitlab-ci', 'github-actions', 'azure-devops', 'continuous', 'automation',
          'docker', 'container', 'kubernetes', 'k8s', 'helm', 'infrastructure'
        ],
        mandatory_triggers: [
          'setup.*pipeline', 'ci.*cd', 'deploy.*application', 'devops.*automation'
        ],
        context_indicators: ['.github/workflows', '.gitlab-ci.yml', 'Jenkinsfile']
      },

      'devops-troubleshooter': {
        confidence_boosters: [
          'debug', 'troubleshoot', 'production.*issue', 'deployment.*failure',
          'log.*analysis', 'incident', 'outage', 'root.*cause', 'monitoring',
          'alert', 'performance.*issue'
        ],
        mandatory_triggers: [
          'debug.*production', 'troubleshoot.*deployment', 'analyze.*logs',
          'incident.*response'
        ],
        context_indicators: ['logs/', 'monitoring/']
      },

      'deployment-engineer': {
        confidence_boosters: [
          'deployment', 'release', 'rollout', 'blue.*green', 'canary',
          'rolling.*update', 'zero.*downtime', 'kubernetes', 'docker', 'helm'
        ],
        mandatory_triggers: [
          'deploy.*to.*production', 'release.*strategy', 'deployment.*pipeline'
        ],
        context_indicators: ['deploy/', 'k8s/', 'helm/']
      },

      'cloud-architect': {
        confidence_boosters: [
          'aws', 'azure', 'gcp', 'cloud', 'terraform', 'cloudformation',
          'infrastructure.*code', 'iac', 's3', 'ec2', 'lambda', 'serverless',
          'multi.*region', 'auto.*scaling', 'load.*balancer'
        ],
        mandatory_triggers: [
          'cloud.*infrastructure', 'terraform.*design', 'aws.*architecture',
          'multi.*cloud'
        ],
        context_indicators: ['terraform/', '.tf', 'cloudformation/']
      },

      'terraform-specialist': {
        confidence_boosters: [
          'terraform', 'tf', 'hcl', 'infrastructure.*code', 'state', 'module',
          'provider', 'resource', 'data.*source', 'variable', 'output'
        ],
        mandatory_triggers: [
          'terraform.*module', 'terraform.*state', 'iac.*terraform'
        ],
        context_indicators: ['.tf', '.tfvars', 'terraform/']
      },

      'monitoring-specialist': {
        confidence_boosters: [
          'monitoring', 'observability', 'metrics', 'prometheus', 'grafana',
          'datadog', 'newrelic', 'splunk', 'elk', 'logging', 'tracing',
          'alert', 'dashboard', 'sla', 'slo', 'sli'
        ],
        mandatory_triggers: [
          'setup.*monitoring', 'observability.*stack', 'metrics.*collection',
          'alerting.*system'
        ],
        context_indicators: ['monitoring/', 'grafana/', 'prometheus/']
      },

      'network-engineer': {
        confidence_boosters: [
          'network', 'dns', 'load.*balancer', 'nginx', 'haproxy', 'cdn',
          'ssl', 'tls', 'certificate', 'firewall', 'vpc', 'subnet', 'routing'
        ],
        mandatory_triggers: [
          'network.*configuration', 'load.*balancer.*setup', 'dns.*configuration',
          'ssl.*certificate'
        ],
        context_indicators: ['nginx.conf', 'haproxy.cfg']
      },

      // ===== DATABASE & DATA =====

      'database-architect': {
        confidence_boosters: [
          'database', 'db', 'schema', 'table', 'index', 'query', 'sql',
          'nosql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
          'data.*model', 'normalization', 'denormalization', 'sharding'
        ],
        mandatory_triggers: [
          'database.*design', 'schema.*design', 'data.*model', 'database.*architecture'
        ],
        context_indicators: ['.sql', 'migrations/', 'schema/']
      },

      'database-optimizer': {
        confidence_boosters: [
          'query.*optimization', 'slow.*query', 'index', 'explain', 'performance',
          'n+1', 'query.*plan', 'database.*tuning', 'caching', 'connection.*pool'
        ],
        mandatory_triggers: [
          'optimize.*query', 'fix.*slow.*query', 'n.*1.*problem', 'database.*performance'
        ],
        context_indicators: ['.sql', 'queries/']
      },

      'data-engineer': {
        confidence_boosters: [
          'data.*pipeline', 'etl', 'elt', 'data.*warehouse', 'bigquery', 'redshift',
          'snowflake', 'spark', 'kafka', 'airflow', 'dbt', 'data.*lake'
        ],
        mandatory_triggers: [
          'build.*pipeline', 'etl.*process', 'data.*warehouse', 'data.*platform'
        ],
        context_indicators: ['dags/', 'airflow/', 'dbt/']
      },

      'data-scientist': {
        confidence_boosters: [
          'machine.*learning', 'ml', 'model', 'algorithm', 'prediction',
          'classification', 'regression', 'clustering', 'deep.*learning',
          'neural.*network', 'tensorflow', 'pytorch', 'sklearn', 'pandas', 'numpy'
        ],
        mandatory_triggers: [
          'train.*model', 'machine.*learning', 'prediction.*model', 'data.*analysis'
        ],
        context_indicators: ['.ipynb', 'notebooks/', 'models/']
      },

      'data-analyst': {
        confidence_boosters: [
          'analysis', 'statistics', 'visualization', 'dashboard', 'report',
          'tableau', 'powerbi', 'looker', 'trend', 'metric', 'kpi', 'sql.*query'
        ],
        mandatory_triggers: [
          'analyze.*data', 'create.*dashboard', 'data.*visualization', 'statistical.*analysis'
        ],
        context_indicators: ['.sql', 'reports/', 'dashboards/']
      },

      // ===== SECURITY =====

      'security-engineer': {
        confidence_boosters: [
          'security', 'vulnerability', 'cve', 'audit', 'penetration',
          'encryption', 'authentication', 'authorization', 'oauth', 'jwt',
          'rbac', 'iam', 'compliance', 'gdpr', 'soc2', 'threat'
        ],
        mandatory_triggers: [
          'security.*audit', 'fix.*vulnerability', 'implement.*auth', 'security.*review'
        ],
        context_indicators: ['security/', 'auth/']
      },

      'mcp-security-auditor': {
        confidence_boosters: [
          'mcp', 'model.*context.*protocol', 'server.*security', 'oauth.*mcp',
          'rbac.*mcp', 'mcp.*compliance', 'mcp.*audit'
        ],
        mandatory_triggers: [
          'mcp.*security', 'audit.*mcp.*server', 'mcp.*oauth'
        ],
        context_indicators: ['mcp-config.json', 'mcp/']
      },

      'penetration-tester': {
        confidence_boosters: [
          'penetration', 'pentest', 'exploit', 'vulnerability.*assessment',
          'ethical.*hacking', 'security.*testing', 'attack.*vector', 'burp.*suite'
        ],
        mandatory_triggers: [
          'penetration.*test', 'security.*assessment', 'vulnerability.*scan'
        ],
        context_indicators: ['security/', 'pentest/']
      },

      'compliance-specialist': {
        confidence_boosters: [
          'compliance', 'gdpr', 'hipaa', 'soc2', 'pci-dss', 'regulation',
          'audit', 'governance', 'policy', 'framework', 'iso.*27001'
        ],
        mandatory_triggers: [
          'compliance.*assessment', 'gdpr.*compliance', 'regulatory.*requirements'
        ],
        context_indicators: ['compliance/', 'policies/']
      },

      'ai-ethics-advisor': {
        confidence_boosters: [
          'ai.*ethics', 'bias', 'fairness', 'responsible.*ai', 'explainability',
          'transparency', 'ai.*safety', 'ethical.*ai', 'ai.*governance'
        ],
        mandatory_triggers: [
          'ai.*ethics', 'bias.*assessment', 'fairness.*evaluation', 'responsible.*ai'
        ],
        context_indicators: ['ai/', 'ml/', 'models/']
      },

      // ===== TESTING & QUALITY =====

      'test-engineer': {
        confidence_boosters: [
          'test', 'testing', 'qa', 'quality', 'jest', 'mocha', 'pytest',
          'unit.*test', 'integration.*test', 'e2e', 'coverage', 'tdd', 'bdd'
        ],
        mandatory_triggers: [
          'write.*test', 'test.*coverage', 'testing.*strategy', 'qa.*automation'
        ],
        context_indicators: ['test/', '__tests__/', '.spec.', '.test.'],
        preferred_alias: 'test-automator'  // Return test-automator instead for consistency
      },

      'test-automator': {
        confidence_boosters: [
          'automation', 'selenium', 'cypress', 'playwright', 'puppeteer',
          'e2e.*test', 'integration.*test', 'test.*suite', 'ci.*test',
          'unit.*test', 'test', 'testing'  // Also handle general test keywords
        ],
        mandatory_triggers: [
          'automate.*test', 'e2e.*automation', 'test.*automation.*setup',
          'write.*test'  // Also handle write test patterns
        ],
        context_indicators: ['e2e/', 'cypress/', 'playwright/', 'test/', '__tests__/']
      },

      'debugger': {
        confidence_boosters: [
          'debug', 'bug', 'error', 'exception', 'stack.*trace', 'breakpoint',
          'investigate', 'issue', 'problem', 'fix', 'troubleshoot'
        ],
        mandatory_triggers: [
          'debug.*issue', 'fix.*bug', 'investigate.*error', 'troubleshoot.*problem'
        ],
        context_indicators: []
      },

      'code-reviewer': {
        confidence_boosters: [
          'code.*review', 'pr.*review', 'pull.*request', 'code.*quality',
          'best.*practice', 'refactor', 'clean.*code', 'maintainability',
          'review.*pull.*request', 'review.*pr', 'review', 'quality'  // PHASE 3: Enhanced patterns
        ],
        mandatory_triggers: [
          'review.*code', 'review.*pr', 'code.*quality.*check',
          'review.*pull.*request'  // PHASE 3: Match PR review prompts
        ],
        context_indicators: ['.git/', '.github/']
      },

      // ===== ARCHITECTURE & DESIGN =====

      'architect-reviewer': {
        confidence_boosters: [
          'architecture', 'design.*pattern', 'solid', 'dry', 'kiss',
          'architectural.*pattern', 'system.*design', 'scalability', 'layering'
        ],
        mandatory_triggers: [
          'review.*architecture', 'architectural.*review', 'design.*review'
        ],
        context_indicators: ['architecture/', 'docs/architecture/']
      },

      'architecture-modernizer': {
        confidence_boosters: [
          'modernize', 'refactor', 'monolith.*microservice', 'legacy',
          'migration', 'rewrite', 'decompose', 'strangler.*pattern'
        ],
        mandatory_triggers: [
          'modernize.*architecture', 'migrate.*microservice', 'refactor.*monolith'
        ],
        context_indicators: ['legacy/', 'migration/']
      },

      'nextjs-architecture-expert': {
        confidence_boosters: [
          'next.js', 'nextjs', 'app.*router', 'pages.*router', 'server.*component',
          'client.*component', 'next.*optimization', 'static.*generation', 'isr'
        ],
        mandatory_triggers: [
          'next.js.*architecture', 'nextjs.*app.*router', 'next.*optimization'
        ],
        context_indicators: ['next.config.js', 'app/', 'pages/']
      },

      'graphql-architect': {
        confidence_boosters: [
          'graphql', 'schema', 'resolver', 'mutation', 'query', 'subscription',
          'apollo', 'relay', 'federation', 'dataloader'
        ],
        mandatory_triggers: [
          'graphql.*schema', 'graphql.*design', 'graphql.*optimization'
        ],
        context_indicators: ['.graphql', 'schema.graphql', 'resolvers/']
      },

      'graphql-performance-optimizer': {
        confidence_boosters: [
          'graphql.*performance', 'n+1.*graphql', 'dataloader', 'caching.*graphql',
          'query.*complexity', 'resolver.*optimization'
        ],
        mandatory_triggers: [
          'optimize.*graphql', 'graphql.*n.*1', 'graphql.*performance'
        ],
        context_indicators: ['resolvers/', 'schema.graphql']
      },

      // ===== API & INTEGRATION =====

      'api-documenter': {
        confidence_boosters: [
          'api.*documentation', 'openapi', 'swagger', 'api.*spec', 'postman',
          'documentation', 'sdk', 'api.*client'
        ],
        mandatory_triggers: [
          'document.*api', 'openapi.*spec', 'swagger.*documentation', 'generate.*sdk'
        ],
        context_indicators: ['openapi.yaml', 'swagger.json', 'api/']
      },

      'mcp-expert': {
        confidence_boosters: [
          'mcp', 'model.*context.*protocol', 'mcp.*server', 'mcp.*integration',
          'mcp.*configuration', 'tool.*server'
        ],
        mandatory_triggers: [
          'mcp.*server', 'mcp.*integration', 'model.*context.*protocol'
        ],
        context_indicators: ['mcp-config.json', 'mcp/']
      },

      'mcp-deployment-orchestrator': {
        confidence_boosters: [
          'mcp.*deploy', 'mcp.*kubernetes', 'mcp.*container', 'mcp.*production',
          'mcp.*scaling', 'mcp.*monitoring'
        ],
        mandatory_triggers: [
          'deploy.*mcp', 'mcp.*kubernetes', 'mcp.*production'
        ],
        context_indicators: ['mcp/', 'k8s/']
      },

      // ===== AI & ML =====

      'ai-engineer': {
        confidence_boosters: [
          'llm', 'language.*model', 'rag', 'retrieval.*augmented', 'embedding',
          'vector.*search', 'prompt.*engineering', 'ai.*application', 'langchain'
        ],
        mandatory_triggers: [
          'llm.*integration', 'rag.*system', 'ai.*application', 'prompt.*pipeline'
        ],
        context_indicators: ['ai/', 'llm/', 'embeddings/']
      },

      'ml-engineer': {
        confidence_boosters: [
          'ml.*pipeline', 'model.*serving', 'mlops', 'model.*deployment',
          'feature.*engineering', 'model.*monitoring', 'a/b.*testing.*ml'
        ],
        mandatory_triggers: [
          'ml.*pipeline', 'deploy.*model', 'mlops.*setup', 'model.*serving'
        ],
        context_indicators: ['mlops/', 'models/', 'pipelines/']
      },

      'model-evaluator': {
        confidence_boosters: [
          'model.*evaluation', 'benchmark', 'model.*selection', 'performance.*comparison',
          'accuracy', 'precision', 'recall', 'f1.*score'
        ],
        mandatory_triggers: [
          'evaluate.*model', 'benchmark.*model', 'compare.*models', 'model.*selection'
        ],
        context_indicators: ['models/', 'evaluation/']
      },

      'prompt-engineer': {
        confidence_boosters: [
          'prompt', 'prompt.*engineering', 'prompt.*optimization', 'few.*shot',
          'zero.*shot', 'chain.*of.*thought', 'prompt.*template'
        ],
        mandatory_triggers: [
          'prompt.*engineering', 'optimize.*prompt', 'prompt.*design'
        ],
        context_indicators: ['prompts/', 'templates/']
      },

      // ===== UI/UX & DESIGN =====

      'ui-ux-designer': {
        confidence_boosters: [
          'ui', 'ux', 'user.*experience', 'user.*interface', 'wireframe',
          'mockup', 'prototype', 'figma', 'design.*system', 'usability'
        ],
        mandatory_triggers: [
          'design.*ui', 'create.*wireframe', 'user.*experience', 'design.*system'
        ],
        context_indicators: ['design/', 'figma/']
      },

      'cli-ui-designer': {
        confidence_boosters: [
          'cli', 'command.*line', 'terminal', 'console', 'tui', 'cli.*interface',
          'terminal.*ui', 'command.*interface'
        ],
        mandatory_triggers: [
          'cli.*interface', 'terminal.*ui', 'command.*line.*tool'
        ],
        context_indicators: ['cli/', 'bin/']
      },

      'web-accessibility-checker': {
        confidence_boosters: [
          'accessibility', 'wcag', 'a11y', 'aria', 'screen.*reader',
          'keyboard.*navigation', 'contrast', 'semantic.*html'
        ],
        mandatory_triggers: [
          'accessibility.*audit', 'wcag.*compliance', 'a11y.*check'
        ],
        context_indicators: ['.html', '.jsx', '.tsx']
      },

      'react-performance-optimizer': {
        confidence_boosters: [
          'react.*performance', 'react.*optimization', 'memo', 'useMemo',
          'useCallback', 'lazy.*loading', 'code.*splitting', 'bundle.*size'
        ],
        mandatory_triggers: [
          'optimize.*react', 'react.*performance', 'react.*bundle'
        ],
        context_indicators: ['.jsx', '.tsx', 'components/']
      },

      // ===== CONTENT & DOCUMENTATION =====

      'technical-researcher': {
        confidence_boosters: [
          'research', 'investigate', 'analyze', 'technical.*analysis',
          'code.*analysis', 'repository.*analysis', 'implementation.*research'
        ],
        mandatory_triggers: [
          'research.*implementation', 'analyze.*repository', 'technical.*research'
        ],
        context_indicators: []
      },

      'comprehensive-researcher': {
        confidence_boosters: [
          'comprehensive.*research', 'in.*depth', 'thorough.*analysis',
          'multi.*source', 'cross.*reference', 'structured.*report'
        ],
        mandatory_triggers: [
          'comprehensive.*research', 'in.*depth.*research', 'thorough.*analysis'
        ],
        context_indicators: []
      },

      'academic-researcher': {
        confidence_boosters: [
          'academic', 'research.*paper', 'peer.*reviewed', 'scholarly',
          'literature.*review', 'citation', 'journal', 'publication'
        ],
        mandatory_triggers: [
          'academic.*research', 'literature.*review', 'research.*paper'
        ],
        context_indicators: ['.bib', 'papers/', 'research/']
      },

      'content-marketer': {
        confidence_boosters: [
          'content', 'marketing', 'blog', 'seo', 'social.*media',
          'copywriting', 'email.*campaign', 'content.*strategy'
        ],
        mandatory_triggers: [
          'content.*marketing', 'seo.*optimization', 'blog.*post', 'marketing.*content'
        ],
        context_indicators: ['content/', 'blog/', 'marketing/']
      },

      'changelog-generator': {
        confidence_boosters: [
          'changelog', 'release.*notes', 'version', 'git.*history',
          'commit.*history', 'release'
        ],
        mandatory_triggers: [
          'generate.*changelog', 'release.*notes', 'version.*history'
        ],
        context_indicators: ['CHANGELOG.md', '.git/']
      },

      'documentation-sync': {
        confidence_boosters: [
          'documentation', 'docs', 'readme', 'api.*docs', 'code.*comments',
          'jsdoc', 'docstring', 'documentation.*drift'
        ],
        mandatory_triggers: [
          'sync.*documentation', 'update.*docs', 'documentation.*audit'
        ],
        context_indicators: ['docs/', 'README.md', '.md']
      },

      // ===== SPECIALIZED =====

      'performance-engineer': {
        confidence_boosters: [
          'performance', 'optimization', 'profiling', 'benchmark', 'bottleneck',
          'latency', 'throughput', 'caching', 'cdn', 'load.*testing'
        ],
        mandatory_triggers: [
          'optimize.*performance', 'profile.*application', 'fix.*bottleneck'
        ],
        context_indicators: []
      },

      'error-detective': {
        confidence_boosters: [
          'error', 'log.*analysis', 'exception', 'crash', 'failure',
          'stack.*trace', 'error.*pattern', 'debugging.*logs'
        ],
        mandatory_triggers: [
          'analyze.*errors', 'investigate.*logs', 'error.*pattern', 'log.*analysis'
        ],
        context_indicators: ['logs/', 'errors/']
      },

      'dependency-manager': {
        confidence_boosters: [
          'dependency', 'npm', 'yarn', 'pip', 'cargo', 'package',
          'vulnerability', 'update', 'audit', 'license'
        ],
        mandatory_triggers: [
          'update.*dependencies', 'audit.*dependencies', 'dependency.*management'
        ],
        context_indicators: ['package.json', 'requirements.txt', 'Cargo.toml']
      },

      'business-analyst': {
        confidence_boosters: [
          'business', 'kpi', 'metrics', 'analytics', 'roi', 'revenue',
          'growth', 'cohort', 'funnel', 'conversion'
        ],
        mandatory_triggers: [
          'business.*analysis', 'kpi.*tracking', 'revenue.*analysis'
        ],
        context_indicators: ['analytics/', 'metrics/']
      },

      'product-strategist': {
        confidence_boosters: [
          'product', 'strategy', 'roadmap', 'feature', 'market.*analysis',
          'user.*research', 'competitive.*analysis', 'go.*to.*market'
        ],
        mandatory_triggers: [
          'product.*strategy', 'roadmap.*planning', 'market.*analysis'
        ],
        context_indicators: ['product/', 'roadmap/']
      },

      'legal-advisor': {
        confidence_boosters: [
          'legal', 'privacy.*policy', 'terms.*of.*service', 'gdpr',
          'compliance', 'license', 'copyright', 'trademark'
        ],
        mandatory_triggers: [
          'privacy.*policy', 'terms.*of.*service', 'legal.*documentation'
        ],
        context_indicators: ['legal/', 'privacy/']
      },

      'competitive-intelligence-analyst': {
        confidence_boosters: [
          'competitor', 'competitive.*analysis', 'market.*research',
          'business.*intelligence', 'industry.*trend', 'market.*positioning'
        ],
        mandatory_triggers: [
          'competitive.*analysis', 'competitor.*research', 'market.*intelligence'
        ],
        context_indicators: []
      },

      'finops-optimizer': {
        confidence_boosters: [
          'cost', 'finops', 'cloud.*cost', 'optimization.*cost', 'budget',
          'aws.*cost', 'azure.*cost', 'gcp.*cost', 'billing'
        ],
        mandatory_triggers: [
          'cost.*optimization', 'finops.*analysis', 'cloud.*cost.*reduction'
        ],
        context_indicators: []
      },

      'shell-scripting-pro': {
        confidence_boosters: [
          'bash', 'shell', 'script', 'automation', 'sh', 'zsh',
          'posix', 'command.*line', 'unix', 'linux'
        ],
        mandatory_triggers: [
          'shell.*script', 'bash.*automation', 'unix.*script'
        ],
        context_indicators: ['.sh', 'bin/', 'scripts/']
      },

      'git-flow-manager': {
        confidence_boosters: [
          'git.*flow', 'branching', 'merge', 'pull.*request', 'release.*branch',
          'hotfix', 'feature.*branch', 'git.*workflow'
        ],
        mandatory_triggers: [
          'git.*flow', 'branching.*strategy', 'release.*management'
        ],
        context_indicators: ['.git/', '.github/']
      },

      'search-specialist': {
        confidence_boosters: [
          'search', 'elasticsearch', 'solr', 'algolia', 'search.*engine',
          'indexing', 'full.*text.*search', 'query.*syntax'
        ],
        mandatory_triggers: [
          'search.*implementation', 'elasticsearch.*setup', 'search.*optimization'
        ],
        context_indicators: ['search/', 'elasticsearch/']
      },

      'command-expert': {
        confidence_boosters: [
          'cli.*command', 'command.*development', 'argument.*parsing',
          'cli.*tool', 'command.*template', 'task.*automation'
        ],
        mandatory_triggers: [
          'cli.*command', 'command.*development', 'task.*automation'
        ],
        context_indicators: ['cli/', 'commands/', 'bin/']
      },

      'llms-maintainer': {
        confidence_boosters: [
          'llms.txt', 'llm.*roadmap', 'ai.*crawler', 'aeo',
          'ai.*engine.*optimization', 'site.*navigation'
        ],
        mandatory_triggers: [
          'llms.txt', 'ai.*crawler.*optimization', 'aeo.*implementation'
        ],
        context_indicators: ['llms.txt', 'public/']
      },

      'context-manager': {
        confidence_boosters: [
          'context', 'multi.*agent', 'workflow', 'session', 'coordination',
          'context.*preservation', 'long.*running.*task'
        ],
        mandatory_triggers: [
          'context.*management', 'multi.*agent.*coordination', 'workflow.*orchestration'
        ],
        context_indicators: []
      },

      'task-decomposition-expert': {
        confidence_boosters: [
          'task.*breakdown', 'workflow.*architecture', 'multi.*step',
          'complex.*goal', 'task.*orchestration', 'decomposition'
        ],
        mandatory_triggers: [
          'task.*decomposition', 'workflow.*breakdown', 'complex.*task.*planning'
        ],
        context_indicators: []
      },

      'project-supervisor-orchestrator': {
        confidence_boosters: [
          'project.*workflow', 'multi.*agent.*orchestration', 'workflow.*coordination',
          'project.*management', 'task.*routing', 'agent.*coordination'
        ],
        mandatory_triggers: [
          'project.*orchestration', 'multi.*agent.*workflow', 'workflow.*coordination'
        ],
        context_indicators: []
      },

      'research-orchestrator': {
        confidence_boosters: [
          'research.*project', 'comprehensive.*research', 'research.*workflow',
          'multi.*source.*research', 'research.*coordination'
        ],
        mandatory_triggers: [
          'research.*orchestration', 'comprehensive.*research.*project', 'research.*coordination'
        ],
        context_indicators: []
      },

      'research-coordinator': {
        confidence_boosters: [
          'research.*coordination', 'specialist.*researchers', 'research.*allocation',
          'research.*planning', 'multi.*faceted.*research'
        ],
        mandatory_triggers: [
          'coordinate.*research', 'allocate.*research.*tasks', 'research.*planning'
        ],
        context_indicators: []
      },

      'research-brief-generator': {
        confidence_boosters: [
          'research.*brief', 'research.*plan', 'research.*structure',
          'research.*framework', 'research.*parameters'
        ],
        mandatory_triggers: [
          'research.*brief', 'create.*research.*plan', 'structure.*research'
        ],
        context_indicators: []
      },

      'report-generator': {
        confidence_boosters: [
          'report', 'documentation', 'findings', 'synthesis', 'summary',
          'final.*report', 'comprehensive.*report', 'research.*report'
        ],
        mandatory_triggers: [
          'generate.*report', 'create.*final.*report', 'synthesize.*findings'
        ],
        context_indicators: ['reports/', 'docs/']
      },

      'text-comparison-validator': {
        confidence_boosters: [
          'compare.*text', 'text.*validation', 'diff', 'comparison',
          'accuracy.*check', 'text.*verification'
        ],
        mandatory_triggers: [
          'compare.*text', 'validate.*text', 'text.*comparison'
        ],
        context_indicators: []
      },

      'connection-agent': {
        confidence_boosters: [
          'obsidian', 'vault', 'links', 'connections', 'knowledge.*graph',
          'backlinks', 'note.*connections'
        ],
        mandatory_triggers: [
          'obsidian.*connections', 'link.*analysis', 'knowledge.*graph'
        ],
        context_indicators: ['.md', 'obsidian/']
      },

      'content-curator': {
        confidence_boosters: [
          'content.*curation', 'content.*quality', 'content.*improvement',
          'outdated.*content', 'consolidation'
        ],
        mandatory_triggers: [
          'curate.*content', 'improve.*content.*quality', 'consolidate.*content'
        ],
        context_indicators: ['content/', 'docs/']
      },

      'review-agent': {
        confidence_boosters: [
          'quality.*assurance', 'cross.*check', 'validation', 'consistency.*check',
          'review.*work', 'quality.*control'
        ],
        mandatory_triggers: [
          'review.*work', 'quality.*assurance', 'validate.*consistency'
        ],
        context_indicators: []
      },

      'statusline-setup': {
        confidence_boosters: [
          'statusline', 'status.*line', 'claude.*code.*status', 'configuration',
          'settings.*status'
        ],
        mandatory_triggers: [
          'configure.*statusline', 'setup.*status.*line'
        ],
        context_indicators: ['.claude/']
      },

      'output-style-setup': {
        confidence_boosters: [
          'output.*style', 'formatting.*style', 'display.*style',
          'claude.*code.*output', 'style.*configuration'
        ],
        mandatory_triggers: [
          'configure.*output.*style', 'setup.*output.*formatting'
        ],
        context_indicators: ['.claude/']
      },

      'Explore': {
        confidence_boosters: [
          'explore', 'codebase', 'repository', 'understand', 'navigate',
          'find', 'search.*code', 'investigate.*codebase'
        ],
        mandatory_triggers: [
          'explore.*codebase', 'understand.*repository', 'navigate.*code'
        ],
        context_indicators: []
      }
    };
  }

  async analyzeInput(input, context = {}) {
    const analysis = {
      input: input.toLowerCase(),
      context: context,
      agent_scores: {},
      recommendations: [],
      confidence_threshold: 0.45,  // PHASE 3: Tuned from 0.5 to 0.45 for better detection
      mandatory_agent: null,
      final_recommendation: null
    };

    // Calculate scores for each agent
    Object.keys(this.roleMapping).forEach(agent => {
      const scoreResult = this.calculateAgentScore(analysis.input, agent, context);
      analysis.agent_scores[agent] = scoreResult.finalScore;

      // Store detailed scores for the top agents (for debugging)
      if (scoreResult.finalScore >= analysis.confidence_threshold) {
        if (!analysis.detailed_scores) {
          analysis.detailed_scores = {};
        }
        analysis.detailed_scores[agent] = scoreResult;
      }
    });

    // Check for mandatory triggers
    analysis.mandatory_agent = this.checkMandatoryTriggers(analysis.input);

    // Build recommendations
    if (analysis.mandatory_agent) {
      let finalAgent = analysis.mandatory_agent;

      // Apply preferred alias if configured
      const agentConfig = this.roleMapping[finalAgent];
      if (agentConfig && agentConfig.preferred_alias) {
        finalAgent = agentConfig.preferred_alias;
      }

      analysis.final_recommendation = finalAgent;
      analysis.recommendations = [{
        agent: analysis.mandatory_agent,
        confidence: 1.0,
        keywordScore: 1.0,
        historicalScore: 0,
        reasoning: 'Mandatory trigger detected'
      }];
    } else {
      // Get top scoring agents
      const sortedAgents = Object.entries(analysis.agent_scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([agent, score]) => score >= analysis.confidence_threshold);

      analysis.recommendations = sortedAgents.slice(0, 3).map(([agent, score]) => {
        const detailed = analysis.detailed_scores && analysis.detailed_scores[agent];
        return {
          agent: agent,
          confidence: score,
          keywordScore: detailed ? detailed.keywordScore : score,
          historicalScore: detailed ? detailed.historicalScore : 0,
          reasoning: this.getReasoningForScore(agent, analysis.input, score)
        };
      });

      if (analysis.recommendations.length > 0) {
        let recommendedAgent = analysis.recommendations[0].agent;

        // Apply preferred alias if configured
        const agentConfig = this.roleMapping[recommendedAgent];
        if (agentConfig && agentConfig.preferred_alias) {
          recommendedAgent = agentConfig.preferred_alias;
        }

        analysis.final_recommendation = recommendedAgent;
      }
    }

    // Phase 2: Log selection for future learning
    if (this.historicalBooster && analysis.final_recommendation) {
      const topRec = analysis.recommendations[0];
      this.historicalBooster.logSelection({
        type: 'agent',
        prompt: input,
        selected: analysis.final_recommendation,
        confidence: topRec.confidence,
        keywordScore: topRec.keywordScore,
        historicalScore: topRec.historicalScore
      });
    }

    return analysis;
  }

  /**
   * Combine keyword score and historical boost (Phase 2)
   */
  combineScores(keywordScore, historicalScore) {
    if (!this.historicalBooster) {
      return keywordScore;
    }

    const config = this.historicalBooster.config;
    const keywordWeight = config.weights.keyword;
    const historicalWeight = config.weights.historical;

    const combined = (keywordScore * keywordWeight) + (historicalScore * historicalWeight);
    return Number(combined.toFixed(3));
  }

  calculateAgentScore(input, agent, context) {
    const mapping = this.roleMapping[agent];
    let keywordScore = 0.0;

    // Phase 1: Boost score for each matching keyword
    mapping.confidence_boosters.forEach(keyword => {
      // PHASE 3: Support regex patterns (e.g., "type.*safety")
      try {
        // Check if keyword contains regex operators
        if (keyword.includes('.*') || keyword.includes('.+') || keyword.includes('\\')) {
          const regex = new RegExp(keyword, 'i');
          if (regex.test(input)) {
            keywordScore += 0.15;
          }
        } else {
          // Simple string match
          if (input.includes(keyword.toLowerCase())) {
            keywordScore += 0.15;
          }
        }
      } catch (e) {
        // If regex fails, fall back to simple includes
        if (input.includes(keyword.toLowerCase())) {
          keywordScore += 0.15;
        }
      }
    });

    // Context indicators
    if (context.files && mapping.context_indicators) {
      mapping.context_indicators.forEach(indicator => {
        if (context.files.some(file => file.includes(indicator))) {
          keywordScore += 0.2;
        }
      });
    }

    // Normalize keyword score
    keywordScore = Math.min(keywordScore, 1.0);

    // Phase 2: Historical boosting
    let historicalScore = 0;
    if (this.enableHistorical && this.historicalBooster && this.historicalBooster.isReady()) {
      historicalScore = this.historicalBooster.queryHistoricalBoost(input, 'agent', agent);
    }

    // Combine scores
    const finalScore = this.combineScores(keywordScore, historicalScore);

    return { finalScore, keywordScore, historicalScore };
  }

  checkMandatoryTriggers(input) {
    for (const [agent, mapping] of Object.entries(this.roleMapping)) {
      for (const trigger of mapping.mandatory_triggers) {
        const regex = new RegExp(trigger, 'i');
        if (regex.test(input)) {
          return agent;
        }
      }
    }
    return null;
  }

  getReasoningForScore(agent, input, score) {
    const mapping = this.roleMapping[agent];
    const matched = mapping.confidence_boosters.filter(k => input.includes(k.toLowerCase()));

    if (matched.length > 0) {
      return `Matched keywords: ${matched.slice(0, 3).join(', ')}`;
    }
    return `General relevance score: ${(score * 100).toFixed(0)}%`;
  }

  async dispatch(input, context = {}) {
    const analysis = await this.analyzeInput(input, context);
    return {
      recommended_agent: analysis.final_recommendation,
      confidence: analysis.recommendations.length > 0 ? analysis.recommendations[0].confidence : 0,
      all_recommendations: analysis.recommendations,
      analysis: analysis
    };
  }
}

module.exports = EnhancedAgentDispatcher;

// CLI usage
if (require.main === module) {
  const dispatcher = new EnhancedAgentDispatcher();
  const input = process.argv.slice(2).join(' ');

  dispatcher.dispatch(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
