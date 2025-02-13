const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Extensiones adicionales (CommonJS support)
  config.resolver.sourceExts.push('cjs'); // Añade soporte para archivos .cjs si son necesarios.

  return config;
})();
