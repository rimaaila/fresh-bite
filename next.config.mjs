/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images are compressed before upload, so Vercel's image optimizer (limited on the free plan) is skipped.
  images: { unoptimized: true },
  // Vercel's serverless request limit is 4.5 MB; uploads are compressed in the browser first.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
