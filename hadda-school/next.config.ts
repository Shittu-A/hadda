import type { NextConfig } from "next";

// v2: exclude pg from edge runtime
const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
};

export default nextConfig;
