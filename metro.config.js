const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase packages mix CJS and ESM bundles. Without Babel transformation,
// ESM modules in node_modules load a separate @firebase/app instance with
// a different component registry, causing "not registered" / "not available" errors.
// Including firebase/* and @firebase/* in the transform list converts all ESM
// to CJS so Metro resolves them consistently through the same registry.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|expo|@expo|@firebase|firebase)/)',
];

module.exports = config;
