// Proxy Clearbit logo requests through the server.
// This avoids browser DNS/CORS issues with logo.clearbit.com.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return new Response('Invalid domain', { status: 400 });
  }

  try {
    const upstream = await fetch(`https://logo.clearbit.com/${domain}`, {
      headers: { 'User-Agent': 'portfolio-tracker/1.0' },
    });

    if (!upstream.ok) {
      return new Response('Not found', { status: 404 });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'image/png';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // cache logos for 24 h
      },
    });
  } catch {
    return new Response('Failed to fetch logo', { status: 502 });
  }
}
