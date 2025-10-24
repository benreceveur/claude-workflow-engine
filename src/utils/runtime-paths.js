#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LEGACY_ROOT = path.join(process.env.HOME, '.claude');
const DEFAULT_ROOT = path.join(process.env.HOME, '.workflow-engine');
const MIGRATION_FLAG = path.join(DEFAULT_ROOT, '.migration-complete');

function copyEntrySync(source, destination) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
        ensureDir(destination);
        fs.readdirSync(source).forEach(entry => {
            copyEntrySync(path.join(source, entry), path.join(destination, entry));
        });
    } else if (stat.isFile()) {
        ensureDir(path.dirname(destination));
        fs.copyFileSync(source, destination);
    }
}

function migrateLegacyData() {
    if (!fs.existsSync(LEGACY_ROOT)) {
        return false;
    }

    try {
        ensureDir(DEFAULT_ROOT);

        ['memory', 'skills', 'logs'].forEach(segment => {
            const source = path.join(LEGACY_ROOT, segment);
            const destination = path.join(DEFAULT_ROOT, segment);
            if (fs.existsSync(source) && !fs.existsSync(destination)) {
                copyEntrySync(source, destination);
            }
        });

        fs.writeFileSync(
            MIGRATION_FLAG,
            JSON.stringify({ migratedAt: new Date().toISOString() }, null, 2)
        );

        return true;
    } catch (error) {
        return false;
    }
}

function ensureBaseDir() {
    const configured = process.env.WORKFLOW_ENGINE_HOME && process.env.WORKFLOW_ENGINE_HOME.trim();
    if (configured) {
        const target = path.resolve(configured);
        ensureDir(target);
        return target;
    }

    if (!fs.existsSync(DEFAULT_ROOT) && fs.existsSync(LEGACY_ROOT) && !fs.existsSync(MIGRATION_FLAG)) {
        migrateLegacyData();
    }

    if (fs.existsSync(DEFAULT_ROOT)) {
        ensureDir(DEFAULT_ROOT);
        return DEFAULT_ROOT;
    }

    if (fs.existsSync(LEGACY_ROOT)) {
        return LEGACY_ROOT;
    }

    ensureDir(DEFAULT_ROOT);
    return DEFAULT_ROOT;
}

function resolveBaseDir() {
    return ensureBaseDir();
}

function ensureDir(target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
}

function getMemoryDir() {
    const dir = path.join(resolveBaseDir(), 'memory');
    ensureDir(dir);
    return dir;
}

function getSkillsDir() {
    const dir = path.join(resolveBaseDir(), 'skills');
    ensureDir(dir);
    return dir;
}

function getLogsDir() {
    const dir = path.join(resolveBaseDir(), 'logs');
    ensureDir(dir);
    return dir;
}

function getIndexRoot() {
    const dir = path.join(resolveBaseDir(), 'index');
    ensureDir(dir);
    return dir;
}

module.exports = {
    resolveBaseDir,
    getMemoryDir,
    getSkillsDir,
    getLogsDir,
    getIndexRoot,
};
