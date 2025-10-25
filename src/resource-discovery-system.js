#!/usr/bin/env node

/**
 * Resource Discovery System v1.0
 * Automatically discovers and catalogs MCP servers, Claude Code agents, and workflow engine skills
 * Provides intelligent resource mapping and orchestration capabilities
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ResourceDiscoverySystem {
    constructor() {
        this.homeDir = os.homedir();
        this.workflowEngineDir = process.cwd();
        this.discoveredResources = {
            mcp_servers: {},
            claude_agents: {},
            workflow_skills: {},
            integration_mappings: {}
        };
    }

    /**
     * Main discovery orchestration method
     */
    async discoverAll() {
        console.log('🔍 Starting comprehensive resource discovery...\n');

        try {
            // Discover MCP servers
            await this.discoverMCPServers();

            // Discover Claude Code agents
            await this.discoverClaudeAgents();

            // Discover workflow engine skills
            await this.discoverWorkflowSkills();

            // Analyze integration points
            await this.analyzeIntegrations();

            // Generate recommendations
            this.generateRecommendations();

            // Save discovery results
            await this.saveDiscoveryResults();

            console.log('\n✅ Discovery complete! Results saved to discovery/auto-discovered-resources.json');

            return this.discoveredResources;

        } catch (error) {
            console.error('❌ Discovery error:', error.message);
            throw error;
        }
    }

    /**
     * Discover MCP servers from various configuration sources
     */
    async discoverMCPServers() {
        console.log('📡 Discovering MCP servers...');

        const mcpConfigs = [];

        // Check standard MCP configuration locations
        const mcpPaths = [
            path.join(this.homeDir, '.mcp.json'),
            path.join(this.homeDir, '.claude.json'),
            path.join(this.homeDir, '.config', 'claude', 'mcp.json'),
            path.join(this.workflowEngineDir, '.mcp.json')
        ];

        for (const configPath of mcpPaths) {
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    mcpConfigs.push({
                        path: configPath,
                        servers: config.mcpServers || {}
                    });
                    console.log(`  ✓ Found MCP config at ${configPath}`);
                } catch (error) {
                    console.log(`  ⚠ Error reading ${configPath}: ${error.message}`);
                }
            }
        }

        // Merge all discovered MCP servers
        this.discoveredResources.mcp_servers = this.mergeMCPConfigs(mcpConfigs);

        // Analyze MCP server capabilities
        this.analyzeMCPCapabilities();

        console.log(`  📊 Discovered ${Object.keys(this.discoveredResources.mcp_servers).length} MCP servers\n`);
    }

    /**
     * Merge multiple MCP configurations intelligently
     */
    mergeMCPConfigs(configs) {
        const merged = {};

        for (const config of configs) {
            for (const [name, serverConfig] of Object.entries(config.servers)) {
                if (!merged[name]) {
                    merged[name] = {
                        ...serverConfig,
                        source: config.path,
                        status: this.determineMCPStatus(serverConfig)
                    };
                }
            }
        }

        return merged;
    }

    /**
     * Determine MCP server configuration status
     */
    determineMCPStatus(serverConfig) {
        if (serverConfig.env) {
            // Check if required environment variables are set
            for (const envVar of Object.keys(serverConfig.env)) {
                if (envVar.includes('TOKEN') || envVar.includes('KEY')) {
                    if (serverConfig.env[envVar] === '<YOUR_TOKEN>' ||
                        serverConfig.env[envVar] === 'your-api-key') {
                        return 'needs_configuration';
                    }
                }
            }
        }

        if (serverConfig.command && serverConfig.command.includes('/abs/path/')) {
            return 'needs_configuration';
        }

        return 'configured';
    }

    /**
     * Analyze MCP server capabilities and categorize them
     */
    analyzeMCPCapabilities() {
        const categories = {
            browser_automation: ['playwright', 'browser', 'chrome', 'selenium'],
            data_sources: ['postgres', 'database', 'filesystem', 'fetch'],
            development_tools: ['github', 'deepgraph', 'code-graph', 'git'],
            infrastructure: ['terraform', 'docker', 'kubernetes'],
            ai_ml: ['huggingface', 'openai', 'anthropic'],
            collaboration: ['figma', 'slack', 'notion']
        };

        for (const [serverName, serverConfig] of Object.entries(this.discoveredResources.mcp_servers)) {
            serverConfig.categories = [];
            const lowerName = serverName.toLowerCase();

            for (const [category, keywords] of Object.entries(categories)) {
                if (keywords.some(keyword => lowerName.includes(keyword))) {
                    serverConfig.categories.push(category);
                }
            }

            if (serverConfig.categories.length === 0) {
                serverConfig.categories.push('specialized');
            }
        }
    }

    /**
     * Discover Claude Code agents
     */
    async discoverClaudeAgents() {
        console.log('🤖 Discovering Claude Code agents...');

        const agentPaths = [
            path.join(this.homeDir, '.claude', 'agents'),
            path.join(this.workflowEngineDir, 'agents'),
            path.join(this.homeDir, '.workflow-engine', 'agents')
        ];

        for (const agentPath of agentPaths) {
            if (fs.existsSync(agentPath)) {
                const files = fs.readdirSync(agentPath);
                const agentFiles = files.filter(f => f.endsWith('.md'));

                console.log(`  ✓ Found ${agentFiles.length} agents at ${agentPath}`);

                for (const agentFile of agentFiles) {
                    const agentName = path.basename(agentFile, '.md');
                    const agentContent = fs.readFileSync(path.join(agentPath, agentFile), 'utf8');

                    this.discoveredResources.claude_agents[agentName] = {
                        path: path.join(agentPath, agentFile),
                        capabilities: this.extractAgentCapabilities(agentContent),
                        category: this.categorizeAgent(agentName, agentContent)
                    };
                }
            }
        }

        console.log(`  📊 Discovered ${Object.keys(this.discoveredResources.claude_agents).length} agents\n`);
    }

    /**
     * Extract agent capabilities from agent definition
     */
    extractAgentCapabilities(content) {
        const capabilities = [];

        // Extract from common patterns in agent definitions
        const patterns = [
            /specializes? in ([^.]+)/gi,
            /expert in ([^.]+)/gi,
            /responsible for ([^.]+)/gi,
            /focuses? on ([^.]+)/gi
        ];

        for (const pattern of patterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                capabilities.push(match[1].trim().toLowerCase());
            }
        }

        return [...new Set(capabilities)];
    }

    /**
     * Categorize agent based on name and content
     */
    categorizeAgent(name, content) {
        const categories = {
            development: ['developer', 'engineer', 'architect', 'programmer'],
            testing: ['test', 'qa', 'quality', 'automation'],
            security: ['security', 'penetration', 'vulnerability', 'compliance'],
            data: ['data', 'analyst', 'scientist', 'ml', 'ai'],
            infrastructure: ['devops', 'cloud', 'terraform', 'docker', 'kubernetes'],
            research: ['research', 'analysis', 'investigation'],
            documentation: ['document', 'writer', 'technical-writer'],
            design: ['design', 'ui', 'ux', 'frontend']
        };

        const lowerName = name.toLowerCase();
        const lowerContent = content.toLowerCase();

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword =>
                lowerName.includes(keyword) || lowerContent.includes(keyword))) {
                return category;
            }
        }

        return 'general';
    }

    /**
     * Discover workflow engine skills
     */
    async discoverWorkflowSkills() {
        console.log('⚙️ Discovering workflow engine skills...');

        const skillPaths = [
            path.join(this.homeDir, '.workflow-engine', 'skills'),
            path.join(this.workflowEngineDir, 'skills')
        ];

        for (const skillPath of skillPaths) {
            if (fs.existsSync(skillPath)) {
                // Read skill manifest if available
                const manifestPath = path.join(skillPath, 'skill-manifest.json');
                if (fs.existsSync(manifestPath)) {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    console.log(`  ✓ Found skill manifest with ${Object.keys(manifest).length} registered skills`);

                    for (const [skillName, skillConfig] of Object.entries(manifest)) {
                        this.discoveredResources.workflow_skills[skillName] = {
                            ...skillConfig,
                            path: path.join(skillPath, skillName),
                            status: 'registered'
                        };
                    }
                }

                // Discover additional skills from directory
                const dirs = fs.readdirSync(skillPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                for (const dir of dirs) {
                    if (!this.discoveredResources.workflow_skills[dir]) {
                        const skillDirPath = path.join(skillPath, dir);
                        this.discoveredResources.workflow_skills[dir] = {
                            path: skillDirPath,
                            status: 'discovered',
                            description: await this.extractSkillDescription(skillDirPath)
                        };
                    }
                }

                console.log(`  ✓ Found ${dirs.length} skill directories at ${skillPath}`);
            }
        }

        console.log(`  📊 Discovered ${Object.keys(this.discoveredResources.workflow_skills).length} skills\n`);
    }

    /**
     * Extract skill description from skill directory
     */
    async extractSkillDescription(skillPath) {
        const readmePath = path.join(skillPath, 'README.md');
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf8');
            const match = content.match(/^#\s+(.+)/m);
            return match ? match[1] : 'No description available';
        } else if (fs.existsSync(readmePath)) {
            const content = fs.readFileSync(readmePath, 'utf8');
            const match = content.match(/^#\s+(.+)/m);
            return match ? match[1] : 'No description available';
        }

        return 'No description available';
    }

    /**
     * Analyze integration points between resources
     */
    async analyzeIntegrations() {
        console.log('🔗 Analyzing integration points...');

        this.discoveredResources.integration_mappings = {
            skill_agent_mappings: this.mapSkillsToAgents(),
            mcp_skill_mappings: this.mapMCPToSkills(),
            agent_mcp_mappings: this.mapAgentsToMCP(),
            orchestration_patterns: this.identifyOrchestrationPatterns()
        };

        console.log('  ✓ Integration analysis complete\n');
    }

    /**
     * Map skills to relevant agents
     */
    mapSkillsToAgents() {
        const mappings = {};

        const skillAgentPatterns = {
            'tech-debt': ['code-reviewer', 'technical-researcher'],
            'test': ['test-engineer', 'test-automator'],
            'security': ['security-engineer', 'penetration-tester'],
            'database': ['database-architect', 'data-engineer'],
            'api': ['api-documenter', 'backend-architect'],
            'performance': ['performance-engineer', 'devops-engineer'],
            'release': ['deployment-engineer', 'devops-engineer']
        };

        for (const skillName of Object.keys(this.discoveredResources.workflow_skills)) {
            mappings[skillName] = [];

            for (const [pattern, agents] of Object.entries(skillAgentPatterns)) {
                if (skillName.toLowerCase().includes(pattern)) {
                    mappings[skillName].push(...agents);
                }
            }

            // Remove duplicates
            mappings[skillName] = [...new Set(mappings[skillName])];
        }

        return mappings;
    }

    /**
     * Map MCP servers to relevant skills
     */
    mapMCPToSkills() {
        const mappings = {};

        const mcpSkillPatterns = {
            'github': ['git-commit-helper', 'pr-author-reviewer', 'release-orchestrator'],
            'postgres': ['database-migrator'],
            'playwright': ['webapp-testing', 'test-first-change'],
            'filesystem': ['codebase-navigator', 'documentation-sync'],
            'terraform': ['finops-optimizer']
        };

        for (const mcpName of Object.keys(this.discoveredResources.mcp_servers)) {
            mappings[mcpName] = [];

            for (const [pattern, skills] of Object.entries(mcpSkillPatterns)) {
                if (mcpName.toLowerCase().includes(pattern)) {
                    mappings[mcpName].push(...skills);
                }
            }

            // Remove duplicates
            mappings[mcpName] = [...new Set(mappings[mcpName])];
        }

        return mappings;
    }

    /**
     * Map agents to relevant MCP servers
     */
    mapAgentsToMCP() {
        const mappings = {};

        const agentMCPPatterns = {
            'devops': ['terraform', 'github', 'docker'],
            'data': ['postgresql', 'filesystem'],
            'frontend': ['DeepGraph React MCP', 'chrome-devtools'],
            'test': ['playwright', 'browser-server'],
            'security': ['github', 'filesystem']
        };

        for (const agentName of Object.keys(this.discoveredResources.claude_agents)) {
            mappings[agentName] = [];

            for (const [pattern, mcps] of Object.entries(agentMCPPatterns)) {
                if (agentName.toLowerCase().includes(pattern)) {
                    mappings[agentName].push(...mcps);
                }
            }

            // Remove duplicates
            mappings[agentName] = [...new Set(mappings[agentName])];
        }

        return mappings;
    }

    /**
     * Identify orchestration patterns
     */
    identifyOrchestrationPatterns() {
        return {
            common_workflows: [
                {
                    name: 'Full Stack Development',
                    agents: ['frontend-developer', 'backend-architect', 'database-architect'],
                    skills: ['ai-code-generator', 'api-documentor', 'database-migrator'],
                    mcp: ['github', 'postgresql', 'DeepGraph React MCP']
                },
                {
                    name: 'DevOps Pipeline',
                    agents: ['devops-engineer', 'deployment-engineer'],
                    skills: ['release-orchestrator', 'container-validator'],
                    mcp: ['github', 'terraform', 'docker']
                },
                {
                    name: 'Security Audit',
                    agents: ['security-engineer', 'penetration-tester'],
                    skills: ['security-scanner', 'dependency-guardian'],
                    mcp: ['github', 'filesystem']
                },
                {
                    name: 'Testing Suite',
                    agents: ['test-engineer', 'test-automator'],
                    skills: ['test-first-change', 'webapp-testing'],
                    mcp: ['playwright-server', 'browser-server', 'chrome-devtools']
                }
            ],

            resource_dependencies: {
                skills_requiring_mcp: this.identifySkillMCPDependencies(),
                agents_requiring_skills: this.identifyAgentSkillDependencies()
            }
        };
    }

    /**
     * Identify skills that require MCP servers
     */
    identifySkillMCPDependencies() {
        return {
            'git-commit-helper': ['github'],
            'pr-author-reviewer': ['github'],
            'database-migrator': ['postgresql'],
            'webapp-testing': ['playwright-server', 'browser-server'],
            'codebase-navigator': ['filesystem']
        };
    }

    /**
     * Identify agents that benefit from specific skills
     */
    identifyAgentSkillDependencies() {
        return {
            'devops-engineer': ['release-orchestrator', 'container-validator'],
            'test-engineer': ['test-first-change', 'webapp-testing'],
            'security-engineer': ['security-scanner', 'dependency-guardian'],
            'data-engineer': ['database-migrator', 'finops-optimizer']
        };
    }

    /**
     * Generate recommendations based on discovery
     */
    generateRecommendations() {
        console.log('💡 Generating recommendations...');

        this.discoveredResources.recommendations = {
            unconfigured_mcp: this.findUnconfiguredMCP(),
            missing_integrations: this.findMissingIntegrations(),
            optimization_opportunities: this.findOptimizationOpportunities(),
            suggested_additions: this.suggestNewResources()
        };

        console.log('  ✓ Recommendations generated\n');
    }

    /**
     * Find unconfigured MCP servers
     */
    findUnconfiguredMCP() {
        const unconfigured = [];

        for (const [name, config] of Object.entries(this.discoveredResources.mcp_servers)) {
            if (config.status === 'needs_configuration') {
                unconfigured.push({
                    name,
                    reason: 'Missing API keys or configuration',
                    action: `Configure ${name} in ~/.mcp.json`
                });
            }
        }

        return unconfigured;
    }

    /**
     * Find missing integration opportunities
     */
    findMissingIntegrations() {
        const missing = [];

        // Check for skills without corresponding agents
        for (const skill of Object.keys(this.discoveredResources.workflow_skills)) {
            const mappedAgents = this.discoveredResources.integration_mappings
                .skill_agent_mappings[skill] || [];

            if (mappedAgents.length === 0) {
                missing.push({
                    type: 'skill_agent',
                    resource: skill,
                    suggestion: 'Consider adding agent mapping for this skill'
                });
            }
        }

        return missing;
    }

    /**
     * Find optimization opportunities
     */
    findOptimizationOpportunities() {
        return [
            {
                area: 'Resource Deduplication',
                description: 'Multiple MCP servers provide similar functionality',
                examples: ['playwright-server', 'browser-server', 'automatalabs-playwright-server']
            },
            {
                area: 'Skill Consolidation',
                description: 'Some skills could be merged for better efficiency',
                examples: ['pdf-anthropic', 'pdf-processing-pro']
            }
        ];
    }

    /**
     * Suggest new resources to add
     */
    suggestNewResources() {
        const suggestions = [];

        // Analyze gaps in coverage
        const hasDatabase = Object.keys(this.discoveredResources.mcp_servers)
            .some(name => name.includes('postgres') || name.includes('database'));

        if (!hasDatabase) {
            suggestions.push({
                type: 'mcp_server',
                name: 'database',
                reason: 'No database MCP server configured'
            });
        }

        const hasMonitoring = Object.keys(this.discoveredResources.workflow_skills)
            .some(name => name.includes('monitor') || name.includes('observability'));

        if (!hasMonitoring) {
            suggestions.push({
                type: 'skill',
                name: 'monitoring-dashboard',
                reason: 'No monitoring skill available'
            });
        }

        return suggestions;
    }

    /**
     * Save discovery results
     */
    async saveDiscoveryResults() {
        const outputDir = path.join(this.workflowEngineDir, 'discovery');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'auto-discovered-resources.json');

        const output = {
            discovery_metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                system: os.platform(),
                node_version: process.version
            },
            resources: this.discoveredResources,
            statistics: {
                total_mcp_servers: Object.keys(this.discoveredResources.mcp_servers).length,
                total_agents: Object.keys(this.discoveredResources.claude_agents).length,
                total_skills: Object.keys(this.discoveredResources.workflow_skills).length,
                configured_mcp: Object.values(this.discoveredResources.mcp_servers)
                    .filter(s => s.status === 'configured').length,
                unconfigured_mcp: Object.values(this.discoveredResources.mcp_servers)
                    .filter(s => s.status === 'needs_configuration').length
            }
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        // Also create a summary report
        this.createSummaryReport(outputDir);
    }

    /**
     * Create human-readable summary report
     */
    createSummaryReport(outputDir) {
        const reportPath = path.join(outputDir, 'discovery-summary.md');

        let report = '# Resource Discovery Summary\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;

        report += '## Statistics\n\n';
        report += `- **MCP Servers**: ${Object.keys(this.discoveredResources.mcp_servers).length}\n`;
        report += `- **Claude Agents**: ${Object.keys(this.discoveredResources.claude_agents).length}\n`;
        report += `- **Workflow Skills**: ${Object.keys(this.discoveredResources.workflow_skills).length}\n\n`;

        report += '## MCP Servers by Category\n\n';
        const mcpByCategory = {};
        for (const [name, config] of Object.entries(this.discoveredResources.mcp_servers)) {
            const categories = config.categories || ['uncategorized'];
            for (const category of categories) {
                if (!mcpByCategory[category]) mcpByCategory[category] = [];
                mcpByCategory[category].push(name);
            }
        }

        for (const [category, servers] of Object.entries(mcpByCategory)) {
            report += `### ${category}\n`;
            for (const server of servers) {
                const status = this.discoveredResources.mcp_servers[server].status;
                const statusEmoji = status === 'configured' ? '✅' : '⚠️';
                report += `- ${statusEmoji} ${server}\n`;
            }
            report += '\n';
        }

        report += '## Recommendations\n\n';

        if (this.discoveredResources.recommendations?.unconfigured_mcp?.length > 0) {
            report += '### Unconfigured MCP Servers\n';
            for (const item of this.discoveredResources.recommendations.unconfigured_mcp) {
                report += `- ${item.name}: ${item.reason}\n`;
            }
            report += '\n';
        }

        if (this.discoveredResources.recommendations?.suggested_additions?.length > 0) {
            report += '### Suggested Additions\n';
            for (const item of this.discoveredResources.recommendations.suggested_additions) {
                report += `- Add ${item.type} "${item.name}": ${item.reason}\n`;
            }
            report += '\n';
        }

        fs.writeFileSync(reportPath, report);
    }
}

// CLI execution
if (require.main === module) {
    const discoverySystem = new ResourceDiscoverySystem();

    discoverySystem.discoverAll()
        .then(resources => {
            console.log('Discovery completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Review discovery/auto-discovered-resources.json');
            console.log('2. Check discovery/discovery-summary.md for recommendations');
            console.log('3. Configure any unconfigured MCP servers');
            console.log('4. Run integration tests with: npm run test:integration');
        })
        .catch(error => {
            console.error('Discovery failed:', error);
            process.exit(1);
        });
}

module.exports = ResourceDiscoverySystem;