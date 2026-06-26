import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(rootDir, '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile workspace + Supabase SSR from source (pnpm monorepo resolution).
  transpilePackages: ['@ccp/shared', '@supabase/ssr'],
};

export default nextConfig;
