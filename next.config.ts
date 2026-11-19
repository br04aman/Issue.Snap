import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
  serverActions: {
    // Image data URIs are base64-encoded (~1.37x) before being sent to the
    // AI server actions. Vercel caps serverless request bodies at ~4.5MB, so
    // this is paired with a 3MB client-side image limit in the complaint form.
    bodySizeLimit: '5mb',
  },
},
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wjsmoxpxtjhjhpegkyyw.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tpxjtfahdmyovlldctpt.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },

    ],
  },
};

export default nextConfig;
