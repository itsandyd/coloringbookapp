/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure webpack to handle canvas
  webpack: (config) => {
    // Return the modified config
    return config;
  },
};

module.exports = nextConfig;
