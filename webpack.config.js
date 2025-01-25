const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Customize the config before returning it.
  // Remove any rules with 'mode' property
  if (config.module && config.module.rules) {
    config.module.rules = config.module.rules.map(rule => {
      if (rule.mode) {
        const { mode, ...restRule } = rule;
        return restRule;
      }
      return rule;
    });
  }

  return config;
}; 