#!/usr/bin/env node

/**
 * Discovery and Integration Script
 * Auto-discovers skills, agents, and MCP servers on the system
 * Merges local configurations with repo defaults
 */

const fs = require('fs');
const path = require('path');

class SystemDiscovery {
  constructor() {
    this.workflowHome = process.env.WORKFLOW_ENGINE_HOME || path.join(process.env.HOME, '.workflow-engine');
    this.repoRoot = path.join(__dirname, '..');
  }

  /**
   * Discover all skills in the workflow engine
   */
  discoverSkills() {
    const skillsDir = path.join(this.workflowHome, 'skills');
    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'common')
      .map(entry => ({
        name: entry.name,
        path: path.join(skillsDir, entry.name),
        hasSkillJson: fs.existsSync(path.join(skillsDir, entry.name, 'skill.json')),
        hasIndexJs: fs.existsSync(path.join(skillsDir, entry.name, 'index.js')),
        hasReadme: fs.existsSync(path.join(skillsDir, entry.name, 'README.md'))
      }));

    console.log(`✓ Discovered ${skills.length} skills`);
    return skills;
  }

  /**
   * Load existing skill manifest
   */
  loadSkillManifest() {
    const manifestPath = path.join(this.workflowHome, 'skills', 'skill-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to load skill manifest: ${error.message}`);
      return {};
    }
  }

  /**
   * Load expanded skill manifest from repo
   */
  loadExpandedManifest() {
    const expandedPath = path.join(this.repoRoot, 'skills', 'skill-manifest-expanded.json');
    if (!fs.existsSync(expandedPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(expandedPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to load expanded manifest: ${error.message}`);
      return {};
    }
  }

  /**
   * Merge skill manifests (preserves user customizations)
   */
  mergeSkillManifests(existing, expanded, discovered) {
    const merged = { ...existing };

    // Add expanded manifest entries (don't overwrite existing)
    for (const [skillName, metadata] of Object.entries(expanded)) {
      if (!merged[skillName]) {
        merged[skillName] = metadata;
      }
    }

    // Add discovered skills without manifest entries (basic metadata)
    for (const skill of discovered) {
      if (!merged[skill.name]) {
        merged[skill.name] = {
          description: `${skill.name} skill (auto-discovered)`,
          keywords: [skill.name.replace(/-/g, ' ')],
          operations: ["execute"],
          defaultContext: {},
          auto_discovered: true
        };
      }
    }

    return merged;
  }

  /**
   * Save merged manifest
   */
  saveSkillManifest(manifest) {
    const manifestPath = path.join(this.workflowHome, 'skills', 'skill-manifest.json');
    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`✓ Saved merged skill manifest (${Object.keys(manifest).length} skills)`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to save manifest: ${error.message}`);
      return false;
    }
  }

  /**
   * Discover Claude Code agents from agent dispatcher
   */
  discoverAgentMappings() {
    const dispatcherPath = path.join(this.workflowHome, 'memory', 'enhanced-agent-dispatcher.js');
    if (!fs.existsSync(dispatcherPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(dispatcherPath, 'utf8');
      // Extract agent names from roleMapping
      const matches = content.match(/['"]([^'"]+)['"]:\s*{[\s\S]*?confidence_boosters/g);
      if (matches) {
        const agents = matches.map(m => m.match(/['"]([^'"]+)['"]/)[1]);
        console.log(`✓ Discovered ${agents.length} agent mappings in dispatcher`);
        return agents;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to analyze agent dispatcher: ${error.message}`);
    }

    return [];
  }

  /**
   * Load comprehensive agent list from system inventory
   */
  loadSystemAgents() {
    const inventoryPath = path.join(this.repoRoot, 'SYSTEM_INVENTORY.json');
    if (!fs.existsSync(inventoryPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(inventoryPath, 'utf8');
      const inventory = JSON.parse(content);
      return inventory.claude_code_agents?.agents || [];
    } catch (error) {
      console.warn(`⚠️  Failed to load system inventory: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate agent dispatcher mappings
   */
  generateAgentMappings(systemAgents, existingMappings) {
    const mappings = {};

    // Priority categories for automatic mapping
    const categories = {
      development: {
        agents: ['frontend-developer', 'backend-architect', 'fullstack-developer', 'typescript-pro', 'javascript-pro', 'python-pro', 'rust-pro', 'c-pro'],
        boosters: ['code', 'develop', 'implement', 'build', 'create']
      },
      infrastructure: {
        agents: ['devops-engineer', 'cloud-architect', 'deployment-engineer', 'terraform-specialist', 'network-engineer'],
        boosters: ['deploy', 'infrastructure', 'cloud', 'kubernetes', 'docker']
      },
      data: {
        agents: ['data-engineer', 'data-scientist', 'data-analyst', 'ml-engineer'],
        boosters: ['data', 'analytics', 'model', 'pipeline']
      },
      security: {
        agents: ['security-engineer', 'penetration-tester', 'compliance-specialist', 'mcp-security-auditor'],
        boosters: ['security', 'vulnerability', 'audit', 'compliance']
      },
      quality: {
        agents: ['test-engineer', 'test-automator', 'code-reviewer', 'architect-reviewer', 'debugger'],
        boosters: ['test', 'quality', 'review', 'debug']
      },
      research: {
        agents: ['technical-researcher', 'academic-researcher', 'comprehensive-researcher', 'search-specialist'],
        boosters: ['research', 'analyze', 'investigate', 'search']
      }
    };

    console.log(`✓ Generating mappings for ${systemAgents.length} agents...`);

    for (const agent of systemAgents) {
      // Skip if already mapped
      if (existingMappings.includes(agent.name)) {
        continue;
      }

      // Find category
      let category = null;
      for (const [catName, catData] of Object.entries(categories)) {
        if (catData.agents.includes(agent.name)) {
          category = catData;
          break;
        }
      }

      // Generate basic mapping
      const agentWords = agent.name.toLowerCase().split('-');
      const descWords = agent.description.toLowerCase().split(' ').slice(0, 10);

      mappings[agent.name] = {
        confidence_boosters: [
          ...agentWords,
          ...descWords.filter(w => w.length > 4),
          ...(category ? category.boosters : [])
        ].filter((v, i, a) => a.indexOf(v) === i), // unique
        mandatory_triggers: [],
        context_indicators: []
      };
    }

    return mappings;
  }

  /**
   * Main integration process
   */
  async integrate() {
    console.log('🔍 Starting system discovery and integration...\n');

    // 1. Discover and merge skills
    console.log('📦 Skills Integration:');
    const discoveredSkills = this.discoverSkills();
    const existingManifest = this.loadSkillManifest();
    const expandedManifest = this.loadExpandedManifest();
    const mergedManifest = this.mergeSkillManifests(existingManifest, expandedManifest, discoveredSkills);
    this.saveSkillManifest(mergedManifest);

    // 2. Discover agents
    console.log('\n🤖 Agents Integration:');
    const existingAgentMappings = this.discoverAgentMappings();
    const systemAgents = this.loadSystemAgents();
    const newMappings = this.generateAgentMappings(systemAgents, existingAgentMappings);

    console.log(`✓ Generated ${Object.keys(newMappings).length} new agent mappings`);
    console.log(`ℹ️  Agent mappings can be added to enhanced-agent-dispatcher.js`);

    // 3. Summary
    console.log('\n📊 Integration Summary:');
    console.log(`  Skills: ${Object.keys(mergedManifest).length} total`);
    console.log(`  Agents: ${systemAgents.length} available, ${existingAgentMappings.length} mapped`);
    console.log(`  New Mappings: ${Object.keys(newMappings).length} generated`);

    // 4. Save integration report
    const report = {
      timestamp: new Date().toISOString(),
      skills: {
        total: Object.keys(mergedManifest).length,
        documented: Object.keys(existingManifest).length,
        expanded: Object.keys(expandedManifest).length,
        discovered: discoveredSkills.length
      },
      agents: {
        available: systemAgents.length,
        mapped: existingAgentMappings.length,
        new_mappings: Object.keys(newMappings).length
      },
      new_agent_mappings: newMappings
    };

    const reportPath = path.join(this.repoRoot, 'integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Integration report saved to: ${reportPath}`);

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const discovery = new SystemDiscovery();
  discovery.integrate()
    .then(() => {
      console.log('\n✅ Integration complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n❌ Integration failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = SystemDiscovery;
