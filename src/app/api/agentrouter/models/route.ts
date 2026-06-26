import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    
    const response = await fetch('https://agentrouter.org/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson: any = null;
      try {
        errJson = JSON.parse(errText);
      } catch (e) {
        // Not valid JSON (likely HTML error from Cloudflare or upstream server)
        return NextResponse.json(
          { error: { message: `Upstream error: ${errText.substring(0, 200)}...` } },
          { status: response.status }
        );
      }
      return NextResponse.json(errJson, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return NextResponse.json(
        { error: { message: `Upstream returned non-JSON response (${contentType || 'empty'}). Content: ${text.substring(0, 200)}...` } },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error in models proxy' } },
      { status: 500 }
    );
  }
}
