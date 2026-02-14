import type { NextConfig } from "next";

/**
 * Next.js configuration for the record collection application
 * Configured to use Bun as the runtime
 */
const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Output standalone for Docker deployment
  output: 'standalone',

  // Configure image optimization for album art
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.discogs.com',
        pathname: '/**',
      },
    ],
    // Allow unoptimized images for development
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
