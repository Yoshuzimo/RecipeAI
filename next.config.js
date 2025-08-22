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
    }

    return config;
  },
};

module.exports = nextConfig;
