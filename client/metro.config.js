const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Expo (Metro) project root is the `client/` directory.
const projectRoot = __dirname;
// Workspace root is the repo root (one level up), where `shared/` lives.
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow importing runtime code from the workspace root (e.g. `../shared/...`).
config.watchFolders = [workspaceRoot];

// Ensure Metro can resolve dependencies from both the app and workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;


