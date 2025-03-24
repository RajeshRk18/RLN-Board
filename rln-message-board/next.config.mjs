import webpack from "webpack"
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
      layers: true,
    }
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      process: require.resolve("process"),
    };

    // Alias process/browser explicitly so webpack can find it
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'process/browser': require.resolve("process"),
    };

    // Add polyfills for Buffer and process
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );

    return config
  },
}

export default nextConfig