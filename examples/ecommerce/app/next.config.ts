import {config} from 'dotenv'
import type {NextConfig} from 'next'

// Load env from parent directory's .env file
config({path: '../.env'})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.work',
      },
    ],
  },
}

export default nextConfig
