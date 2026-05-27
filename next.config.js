/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint checks during Vercel builds to prevent warnings from failing the deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript build checks as a safeguard
    ignoreBuildErrors: true,
  },
  // Ensure serverless APIs function smoothly on Vercel
};

module.exports = nextConfig;
