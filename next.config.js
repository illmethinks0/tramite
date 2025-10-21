/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // PDF processing configuration
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Handle pdfjs-dist worker
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]'
      }
    });

    return config;
  },
  images: {
    domains: ['localhost'], // Add Supabase domains when ready
  },
};

module.exports = nextConfig;
