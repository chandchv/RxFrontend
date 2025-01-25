const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'], // Add the extensions you're using
  },
}; 