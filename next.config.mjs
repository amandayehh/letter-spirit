/** @type {import('next').NextConfig} */

// On GitHub Pages a project site is served from /<repo>/. The deploy workflow
// sets BASE_PATH=/letter-spirit so assets and routes resolve correctly; locally
// it's unset and the app runs from the root.
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
