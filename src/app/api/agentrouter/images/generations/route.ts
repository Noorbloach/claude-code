import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function logToFile(data: any) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${JSON.stringify(data, null, 2)}`);
  } catch (e) {
    console.error('Failed to log message', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('Authorization') || '';

    logToFile({ action: 'request_started', body, hasAuth: !!authHeader });

    const response = await fetch('https://agentrouter.org/v1/images/generations', {
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
      let errJson: any = {};
      try { errJson = JSON.parse(errText); } catch {}
      
      logToFile({
        action: 'request_failed',
        status: response.status,
        errText,
        errJson
      });

      return NextResponse.json(
        { error: { message: errJson?.error?.message || `Image generation failed. Status: ${response.status}` } },
        { status: response.status }
      );
    }

    const data = await response.json();
    logToFile({ action: 'request_success', data });
    return NextResponse.json(data);
  } catch (error: any) {
    logToFile({ action: 'request_error', message: error.message, stack: error.stack });
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error in image generation proxy' } },
      { status: 500 }
    );
  }
}

