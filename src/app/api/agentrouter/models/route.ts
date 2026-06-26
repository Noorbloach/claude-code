import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    
    const response = await fetch('https://agentrouter.org/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Originator': 'codex_cli_rs',
        'User-Agent': 'codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464',
        'Version': '0.101.0',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(errText, { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
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
