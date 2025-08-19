
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
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
  webpack(config, { isServer }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    
    // Exclude firebase-admin from client-side bundles.
    if (!isServer) {
      // This is the most robust way to prevent the client from trying to bundle a server-only package.
      config.resolve.alias['firebase-admin'] = false;
    }

    return config;
  },
};

module.exports = nextConfig;
