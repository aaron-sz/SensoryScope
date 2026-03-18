// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package exports so zod v4 subpath imports resolve correctly
// (required by react-native-executorch → zod v3.25+ which ships v4 internals)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
