
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.experiments = { ...(config.experiments || {}), asyncWebAssembly: true };

    if (!isServer) {
      // Exclude server-side packages from the client-side bundle
      config.externals = [
        ...(config.externals || []),
        'firebase-admin',
      ];

      // Provide empty fallbacks for Node.js modules that should not be in the browser
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "fs": false,
        "net": false,
        "tls": false,
        "cardinal": false,
        "@opentelemetry/winston-transport": false,
        "@opentelemetry/exporter-jaeger": false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
