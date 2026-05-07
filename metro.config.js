const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase's @firebase/webchannel-wrapper exposes its implementations only via
// package.json `exports` sub-paths (./bloom-blob, ./webchannel-blob).
// Without package exports enabled, Metro can't resolve these and Firestore fails
// with "Service firestore is not available".
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'default', 'react-native'];

// Force Metro to use CJS main builds instead of browser ESM builds for Firebase.
// This avoids split @firebase/app registry instances that cause "not registered" errors.
config.resolver.resolverMainFields = ['react-native', 'main'];

// Transform any remaining ESM syntax in firebase/* and @firebase/* packages.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@firebase/.*|firebase/.*|@react-native-async-storage/.*))',
];

module.exports = config;
