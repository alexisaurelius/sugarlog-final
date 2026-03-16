const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for: Unable to resolve "@expo/metro-runtime/rsc/runtime"
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime/rsc/runtime') {
    const filePath = path.resolve(__dirname, 'node_modules/@expo/metro-runtime/rsc/runtime.js');
    return { type: 'sourceFile', filePath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
