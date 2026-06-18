const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = Array.from(new Set([...config.resolver.platforms, 'native', 'web']));

module.exports = config;
