const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase's @firebase/webchannel-wrapper exposes its implementations only via
// package.json `exports` sub-paths (./bloom-blob, ./webchannel-blob).
// Without package exports enabled, Metro can't resolve these and Firestore fails
// with "Service firestore is not available".
config.resolver.unstable_enablePackageExports = true;

// On native: force Firebase's React Native CJS builds to avoid split @firebase/app
// registry instances ("not registered" errors).
// On web: leave resolution alone so Firebase uses its browser build — forcing the
// React Native build on web causes "FirebaseError cannot be invoked without 'new'".
const isWeb = process.argv.some(
  (arg) => arg === 'web' || arg === '--platform=web'
);

if (!isWeb) {
  config.resolver.unstable_conditionNames = ['require', 'default', 'react-native'];
  config.resolver.resolverMainFields = ['react-native', 'main'];
}

// Transform Firebase packages so Metro can handle their ESM syntax.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@firebase/.*|firebase/.*|@react-native-async-storage/.*))',
];

module.exports = config;
