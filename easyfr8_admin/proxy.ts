import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://easyfr8.vnvision.in',
  'https://adminfr8.vnvision.in',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  // Validate if origin is in the allowed list
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const allowOriginHeader = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOriginHeader,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = NextResponse.next();
  
  // Set CORS headers on the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
