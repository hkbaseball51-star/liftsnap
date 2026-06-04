import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],

    // Client-side Router Cache TTL.
    // dynamic: 30s — repeated tab switches reuse the cached HTML instead of
    // hitting the server again.  Invalidated when a Server Action calls
    // revalidatePath (e.g. after saving a workout the home page refreshes).
    // static: 180s — statically-rendered segments stay warm even longer.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
