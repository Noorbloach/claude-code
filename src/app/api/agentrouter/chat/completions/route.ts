import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('Authorization') || '';
    
    const response = await fetch('https://agentrouter.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Originator': 'codex_cli_rs',
        'User-Agent': 'codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464',
        'Version': '0.101.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson: any = null;
      try {
        errJson = JSON.parse(errText);
      } catch (e) {
        // Not valid JSON (likely HTML error from Cloudflare or upstream server)
        return new Response(
          JSON.stringify({ error: { message: `Upstream error: ${errText.substring(0, 200)}...` } }),
          { 
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(JSON.stringify(errJson), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the readable stream directly back to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering on Nginx reverse proxies (Hostinger VPS)
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: { message: error.message || 'Internal server error in completions proxy' } }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
