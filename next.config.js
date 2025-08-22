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
      // Exclude server-only packages from the client-side bundle
      config.externals = [
        ...(config.externals || []),
        'firebase-admin',
      ];

      // Provide empty fallbacks for Node.js + optional tracing modules
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
        cardinal: false,

        // Ignore optional OpenTelemetry / tracing transports
        '@opentelemetry/winston-transport': false,
        '@opentelemetry/exporter-jaeger': false,
        '@opentelemetry/exporter-zipkin': false,
        '@opentelemetry/exporter-trace-otlp-http': false,
        '@opentelemetry/exporter-trace-otlp-grpc': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
