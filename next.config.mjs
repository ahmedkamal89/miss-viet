/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['web-push', 'nodemailer'],
  images: { unoptimized: true },
};
export default nextConfig;
