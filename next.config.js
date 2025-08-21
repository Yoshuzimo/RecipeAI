
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
    // This is the crucial part.
    // It prevents server-side packages from being bundled into the client-side code.
    if (!isServer) {
      config.externals.push('firebase-admin');
    }
    
    // This is needed for another dependency.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    return config;
  },
};

module.exports = nextConfig;
