import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [{source:"/:path*",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
    {key:"Content-Security-Policy",value:"default-src 'self'; img-src 'self' data: https:; media-src 'self' https://www.youtube-nocookie.com; frame-src https://www.youtube-nocookie.com https://checkout.paystack.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.paystack.co"}
  ]}]}
};

export default nextConfig;
