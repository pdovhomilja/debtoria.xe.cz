import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the production Docker image.
  output: "standalone",
  experimental: {
    serverActions: {
      // Evidence uploads (10MB cap) are posted via Server Actions; the
      // framework default of 1MB would reject them before attachEvidence
      // ever runs. 12MB leaves headroom for multipart overhead.
      bodySizeLimit: "12mb",
    },
    // Every request (including the evidence upload Server Action) passes
    // through proxy.ts, which by default buffers only the first 10MB of the
    // request body it clones through — silently truncating anything larger
    // and corrupting the multipart body before it reaches the action. Must
    // match/exceed serverActions.bodySizeLimit above.
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
