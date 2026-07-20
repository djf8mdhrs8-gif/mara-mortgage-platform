import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages are consumed as TypeScript-built dist; transpile the
  // shared-types package so Next can follow it inside the monorepo.
  transpilePackages: ['@mara/shared-types'],
};

export default nextConfig;
