
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
    if (!isServer) {
      // Exclude server-side packages from the client-side bundle
      config.externals = [...(config.externals || []), 'firebase-admin'];
      
      // Provide empty fallbacks for Node.js modules that should not be in the browser
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "fs": false,
        "net": false,
        "tls": false,
        "cardinal": false,
      };
    }
    
    // Required for genkit to work
    config.experiments = { ...(config.experiments || {}), asyncWebAssembly: true };
    
    return config;
  },
};

module.exports = nextConfig;
