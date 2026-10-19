import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The homepage checks which photos exist in public/images/home at request time.
  // Hosts like Vercel serve public/ from a CDN, so bundle those files with the page's server code too.
  outputFileTracingIncludes: {
    "/": ["./public/images/home/**/*"],
  },
};

export default nextConfig;
