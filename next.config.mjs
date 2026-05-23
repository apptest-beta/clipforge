/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Don't try to bundle these - load them from node_modules at runtime so
  // ffmpeg-static can resolve its native binary path correctly.
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  // Make sure the actual ffmpeg binary is copied into the standalone trace
  // for the cut route, otherwise spawn() can't find it in production.
  outputFileTracingIncludes: {
    '/api/cut': ['./node_modules/ffmpeg-static/**/*'],
  },
}

export default nextConfig
