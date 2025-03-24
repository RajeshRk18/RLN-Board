const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Replace minimizer plugins with a new TerserPlugin instance that excludes worker files
      webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.map((plugin) => {
        if (plugin.constructor.name === "TerserPlugin") {
          return new TerserPlugin({
            exclude: /worker\..*\.js$/, // Exclude any file that looks like "worker.*.js"
            terserOptions: {
              parse: {
                ecma: 8, // Parse as ES8
              },
              compress: {
                ecma: 5,
                warnings: false,
                comparisons: false,
              },
              mangle: {
                safari10: true,
              },
              output: {
                ecma: 5,
                comments: false,
                ascii_only: true,
              },
            },
            parallel: true,
          });
        }
        return plugin;
      });
      return webpackConfig;
    },
  },
};
