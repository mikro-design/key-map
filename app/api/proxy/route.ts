import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { logger } from '@/lib/utils/logger';

/**
 * API Proxy Route
 *
 * Proxies requests to external map tile services to avoid CORS issues
 * SECURITY HARDENED: Domain whitelist, rate limiting, SSRF protection
 *
 * Usage: /api/proxy?url=https://external-service.com/tiles/{z}/{x}/{y}
 */

// Allowed domains for proxying
const ALLOWED_DOMAINS = [
  'basemaps.cartocdn.com',
  'tile.openstreetmap.org',
  'server.arcgisonline.com',
  'api.maptiler.com',
  'tiles.stadiamaps.com',
  'tile.openstreetmap.fr',
  'basemap.nationalmap.gov',
];

// Blocked IP ranges (prevent SSRF attacks)
const BLOCKED_IP_RANGES = [
  /^10\./,                          // Private: 10.0.0.0/8
  /^127\./,                         // Loopback: 127.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,    // Private: 172.16.0.0/12
  /^192\.168\./,                    // Private: 192.168.0.0/16
  /^169\.254\./,                    // Link-local: 169.254.0.0/16
  /^224\./,                         // Multicast: 224.0.0.0/4
  /^0\./,                           // Invalid
  /^255\./,                         // Broadcast
  /^localhost$/i,                   // Localhost
];

// Configuration
const MAX_SIZE = 10 * 1024 * 1024; // 10MB max response size
const TIMEOUT_MS = 30000; // 30 second timeout
const RATE_LIMIT = 100; // requests per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRateLimit(ip, RATE_LIMIT, RATE_LIMIT_WINDOW);

    if (!rateLimit.success) {
      logger.warn('Rate limit exceeded', { ip, url: request.url });

      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 2. Get and validate URL parameter
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 3. Parse and validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 4. Protocol validation
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      logger.security('Blocked non-HTTP protocol', { ip, protocol: url.protocol, url: targetUrl });

      return NextResponse.json(
        { error: 'Only HTTP and HTTPS protocols are allowed' },
        { status: 400 }
      );
    }

    // 5. Domain whitelist check
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      logger.security('Blocked request to non-whitelisted domain', {
        ip,
        hostname: url.hostname,
        url: targetUrl,
      });

      return NextResponse.json(
        { error: 'Domain not whitelisted. Only approved map tile services are allowed.' },
        { status: 403 }
      );
    }

    // 6. SSRF protection - check for private IP addresses
    const hostname = url.hostname;

    // Check if hostname is a private IP
    if (BLOCKED_IP_RANGES.some(range => range.test(hostname))) {
      logger.security('SSRF attempt blocked - private IP in URL', {
        ip,
        hostname,
        url: targetUrl,
      });

      return NextResponse.json(
        { error: 'Access to internal resources is forbidden' },
        { status: 403 }
      );
    }

    // 7. Fetch with timeout and size limit
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'KeyMap/1.0',
          'Accept': 'image/*,application/json,application/x-protobuf',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn('Upstream error', { status: response.status, url: targetUrl });

        return NextResponse.json(
          { error: `Upstream error: ${response.status}` },
          { status: response.status }
        );
      }

      // 8. Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        logger.warn('Response too large', { size: contentLength, url: targetUrl });

        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      // 9. Stream with size limit
      const data = await response.arrayBuffer();

      if (data.byteLength > MAX_SIZE) {
        logger.warn('Response exceeded size limit', { size: data.byteLength, url: targetUrl });

        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // 10. Return proxied response
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
            ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://keymap.com')
            : '*',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        logger.warn('Request timeout', { url: targetUrl, timeout: TIMEOUT_MS });

        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    logger.error('Proxy error', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
        ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://keymap.com')
        : '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
