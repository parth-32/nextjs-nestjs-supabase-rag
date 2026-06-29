/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile workspace + Supabase SSR from source (pnpm monorepo resolution).
  transpilePackages: ['@ccp/shared', '@supabase/ssr'],
};

export default nextConfig;
