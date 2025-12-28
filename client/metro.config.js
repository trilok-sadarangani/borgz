const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const metroResolver = require('metro-resolver');

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

// Work around `import.meta` syntax errors on Expo web.
// Some packages (e.g. zustand) publish ESM builds that reference `import.meta.env`.
// Metro may pick the ESM export condition for web, but the resulting bundle is executed
// as a classic script in the browser, causing: "Cannot use 'import.meta' outside a module".
// Force the CommonJS entry for zustand middleware on web.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'zustand/middleware') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(projectRoot, 'node_modules/zustand/middleware.js'),
      };
    }
    if (moduleName.startsWith('zustand/middleware/')) {
      const subpath = moduleName.slice('zustand/middleware/'.length);
      return {
        type: 'sourceFile',
        filePath: path.resolve(projectRoot, 'node_modules/zustand/middleware', `${subpath}.js`),
      };
    }
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return metroResolver.resolve(context, moduleName, platform);
};

module.exports = config;


