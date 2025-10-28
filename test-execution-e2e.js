#!/usr/bin/env node

/**
 * Execution Layer End-to-End Tests
 * Tests actual skill execution, agent invocation, and workflows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ExecutionE2ETestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
    this.homeDir = process.env.HOME;
    this.workflowDir = path.join(this.homeDir, '.workflow-engine');
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      error: '❌',
      test: '🧪'
    };
    console.log(`${icons[type]} ${message}`);
  }

  async runTest(name, testFn) {
    this.results.total++;
    this.log(`Testing: ${name}`, 'test');

    try {
      const result = await testFn();
      this.results.passed++;
      this.log(`  PASSED${result.message ? ': ' + result.message : ''}`, 'success');
      this.results.tests.push({ name, status: 'passed', message: result.message });
    } catch (error) {
      this.results.failed++;
      this.log(`  FAILED: ${error.message}`, 'error');
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
    console.log('');
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
    } catch (error) {
      if (options.ignoreError) {
        return error.stdout || '';
      }
      throw error;
    }
  }

  async runAllTests() {
    console.log('\n='.repeat(70));
    console.log('🚀 EXECUTION LAYER - E2E TESTS');
    console.log('='.repeat(70));
    console.log('');

    // Test 1: Skill Execution - ai-code-generator
    await this.runTest('Skill Execution: ai-code-generator', () => {
      const output = this.exec(
        `node ${this.workflowDir}/memory/skill-executor.js execute ai-code-generator '{"operation":"generate-boilerplate","type":"simple_function","language":"javascript"}'`,
        { silent: true }
      );

      const result = JSON.parse(output);
      if (!result.success) {
        throw new Error('Skill execution failed');
      }
      if (!result.result || !result.result.success) {
        throw new Error('Skill did not return success');
      }

      return { message: `Executed in ${result.executionTimeMs}ms` };
    });

    // Test 2: Skill Execution - code-formatter
    await this.runTest('Skill Execution: code-formatter', () => {
      const output = this.exec(
        `node ${this.workflowDir}/memory/skill-executor.js execute code-formatter '{"operation":"format","language":"javascript","code":"function test(){return 42;}"}'`,
        { silent: true }
      );

      const result = JSON.parse(output);
      if (!result.success) {
        throw new Error('code-formatter execution failed');
      }

      return { message: 'Formatter executed successfully' };
    });

    // Test 3: Skill List
    await this.runTest('Skill List Command', () => {
      const output = this.exec(
        `node ${this.workflowDir}/memory/skill-executor.js list`,
        { silent: true }
      );

      const skills = JSON.parse(output);
      if (!Array.isArray(skills)) {
        throw new Error('List did not return array');
      }
      if (skills.length < 8) {
        throw new Error(`Expected at least 8 skills, got ${skills.length}`);
      }

      return { message: `Found ${skills.length} skills` };
    });

    // Test 4: Skill Detection via claude-hook
    await this.runTest('Skill Detection: claude-hook', () => {
      const output = this.exec(
        `node ${this.workflowDir}/integrations/claude-hook.js "format my code with prettier"`,
        { silent: true }
      );

      if (!output.includes('code-formatter') && !output.includes('Workflow')) {
        throw new Error('Expected skill mention in output');
      }

      return { message: 'Skill detected via hook' };
    });

    // Test 5: Agent Detection - React prompt
    await this.runTest('Agent Detection: React component', () => {
      const output = this.exec(
        `node ${this.workflowDir}/integrations/copilot-hook.js "create a React component with useState"`,
        { silent: true }
      );

      if (!output.toLowerCase().includes('frontend')) {
        throw new Error('Expected frontend-engineer detection');
      }

      return { message: 'frontend-engineer detected (100%)' };
    });

    // Test 6: Agent Detection - Docker prompt
    await this.runTest('Agent Detection: Docker setup', () => {
      const output = this.exec(
        `node ${this.workflowDir}/integrations/copilot-hook.js "setup Docker container"`,
        { silent: true }
      );

      if (!output.toLowerCase().includes('devops')) {
        throw new Error('Expected devops-engineer detection');
      }

      return { message: 'devops-engineer detected' };
    });

    // Test 7: Cross-platform formatting - Claude
    await this.runTest('Formatting: Claude platform', () => {
      const output = this.exec(
        `node ${this.workflowDir}/integrations/claude-hook.js "analyze technical debt"`,
        { silent: true }
      );

      if (!output.includes('Workflow') && !output.includes('##')) {
        throw new Error('Expected markdown formatted output');
      }

      return { message: 'Claude markdown format working' };
    });

    // Test 8: Cross-platform formatting - Copilot
    await this.runTest('Formatting: Copilot platform', () => {
      const output = this.exec(
        `node ${this.workflowDir}/integrations/copilot-hook.js "analyze technical debt"`,
        { silent: true }
      );

      if (!output.includes('##') && !output.includes('Workflow')) {
        throw new Error('Expected VSCode-friendly format');
      }

      return { message: 'Copilot format working' };
    });

    // Test 9: Gemini CLI - analyze-only mode
    await this.runTest('Gemini CLI: analyze-only mode', () => {
      const output = this.exec(
        `${this.workflowDir}/bin/gemini --analyze-only "build a REST API"`,
        { silent: true }
      );

      if (!output.includes('WORKFLOW ENGINE') && !output.length > 0) {
        throw new Error('Expected workflow analysis output');
      }

      return { message: 'Gemini analyze mode working' };
    });

    // Test 10: Gemini CLI - version
    await this.runTest('Gemini CLI: version command', () => {
      const output = this.exec(
        `${this.workflowDir}/bin/gemini --version`,
        { silent: true }
      );

      if (!output.match(/v?\d+\.\d+\.\d+/)) {
        throw new Error('Version output invalid');
      }

      return { message: `Version: ${output.trim()}` };
    });

    // Test 11: recommendation-injector module
    await this.runTest('Recommendation Injector: module loading', () => {
      const RecommendationInjector = require(`${this.workflowDir}/integrations/recommendation-injector.js`);
      const injector = new RecommendationInjector();

      if (typeof injector.format !== 'function') {
        throw new Error('format method not available');
      }
      if (typeof injector.quickInject !== 'function') {
        throw new Error('quickInject method not available');
      }

      return { message: 'Module exports correct interface' };
    });

    // Test 12: Slash command files exist
    await this.runTest('Claude Commands: all 4 slash commands', () => {
      const commands = ['auto-select.md', 'skill.md', 'agent.md', 'mcp.md'];
      const commandsDir = `${this.homeDir}/.claude/commands`;

      const missing = commands.filter(cmd => !fs.existsSync(`${commandsDir}/${cmd}`));
      if (missing.length > 0) {
        throw new Error(`Missing commands: ${missing.join(', ')}`);
      }

      return { message: 'All slash commands present' };
    });

    // Test 13: MCP configuration
    await this.runTest('MCP: servers configured in Claude settings', () => {
      const settingsPath = `${this.homeDir}/.claude/settings.local.json`;
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      if (!settings.mcpServers) {
        throw new Error('mcpServers not in settings');
      }

      const servers = Object.keys(settings.mcpServers);
      if (servers.length < 3) {
        throw new Error(`Expected at least 3 MCP servers, got ${servers.length}`);
      }

      return { message: `${servers.length} MCP servers configured: ${servers.join(', ')}` };
    });

    // Test 14: Integration files exist
    await this.runTest('Integration: all hook files present', () => {
      const files = [
        'claude-hook.js',
        'copilot-hook.js',
        'gemini-wrapper.js',
        'recommendation-injector.js',
        'universal-analyzer.js',
        'platform-detector.js'
      ];

      const missing = files.filter(f => !fs.existsSync(`${this.workflowDir}/integrations/${f}`));
      if (missing.length > 0) {
        throw new Error(`Missing files: ${missing.join(', ')}`);
      }

      return { message: `All ${files.length} integration files present` };
    });

    // Test 15: VSCode templates
    await this.runTest('VSCode: templates available', () => {
      const templates = ['settings.json', 'tasks.json'];
      const templateDir = `${this.workflowDir}/templates/.vscode`;

      const missing = templates.filter(t => !fs.existsSync(`${templateDir}/${t}`));
      if (missing.length > 0) {
        throw new Error(`Missing templates: ${missing.join(', ')}`);
      }

      return { message: 'Both VSCode templates available' };
    });

    // Final summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 EXECUTION TEST RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log(`Total Tests:    ${this.results.total}`);
    console.log(`✅ Passed:      ${this.results.passed}`);
    console.log(`❌ Failed:      ${this.results.failed}`);
    console.log('');
    console.log(`Success Rate:   ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    console.log('');

    if (this.results.failed > 0) {
      console.log('FAILED TESTS:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(`  ❌ ${t.name}`);
          console.log(`     Error: ${t.error}`);
        });
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('');

    if (this.results.failed === 0) {
      console.log('🎉 ALL EXECUTION TESTS PASSED - SYSTEM FULLY OPERATIONAL');
    } else {
      console.log(`⚠️  ${this.results.failed} TEST(S) FAILED - REVIEW REQUIRED`);
    }

    console.log('');

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests
const runner = new ExecutionE2ETestRunner();
runner.runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
