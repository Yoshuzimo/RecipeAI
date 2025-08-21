
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
    // Prevent firebase-admin from being bundled on the client
    if (!isServer) {
      config.externals.push('firebase-admin');
    }
    
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    
    return config;
  },
};

module.exports = nextConfig;
