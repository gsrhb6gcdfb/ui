/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Electron packaging (enabled via ELECTRON_BUILD=1)
  ...(process.env.ELECTRON_BUILD === "1" ? { output: "export" } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
