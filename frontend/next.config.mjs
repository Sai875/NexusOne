/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const gateway = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return [
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
      { source: '/graphql', destination: `${gateway}/graphql` },
      { source: '/graphql/:path*', destination: `${gateway}/graphql/:path*` },
    ];
  },
};

export default nextConfig;
