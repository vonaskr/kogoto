const nextConfig: import('next').NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Permissions-Policy -> microphone=* に
          { key: 'Permissions-Policy', value: 'microphone=*' },
          
        ],
      },
    ];
  },
};
export default nextConfig;
