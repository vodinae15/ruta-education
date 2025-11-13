/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr', 'pdf-parse', 'mammoth'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Убеждаемся, что Supabase модули правильно обрабатываются
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
  // Отключаем оптимизацию для Supabase модулей, которые могут вызывать проблемы
  transpilePackages: [],
}

export default nextConfig