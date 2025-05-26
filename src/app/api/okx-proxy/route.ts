import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Authentication helper functions for OKX API
function createSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
  const secretKey = process.env.OKX_SECRET_KEY || '';
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function getAuthHeaders(method: string, requestPath: string, body: string = '') {
  const apiKey = process.env.OKX_API_KEY || '';
  const passphrase = process.env.OKX_API_PASSPHRASE || '';
  const timestamp = Date.now().toString();
  const signature = createSignature(timestamp, method, requestPath, body);

  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const chainIndex = searchParams.get('chainIndex');
    const tokenContractAddress = searchParams.get('tokenContractAddress');
    const bar = searchParams.get('bar');
    const limit = searchParams.get('limit');
    const address = searchParams.get('address');
    const chains = searchParams.get('chains');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      );
    }

    // Build the OKX API URL
    let okxUrl = `https://web3.okx.com/api/v5/dex/${endpoint}`;
    const params = new URLSearchParams();

    if (chainIndex) params.append('chainIndex', chainIndex);
    if (tokenContractAddress) params.append('tokenContractAddress', tokenContractAddress);
    if (bar) params.append('bar', bar);
    if (limit) params.append('limit', limit);
    if (address) params.append('address', address);
    if (chains) params.append('chains', chains);

    if (params.toString()) {
      okxUrl += `?${params.toString()}`;
    }

    console.log(`Proxying request to: ${okxUrl}`);

    // Determine if authentication is needed based on endpoint
    const needsAuth = endpoint.includes('balance') || endpoint.includes('wallet') || endpoint.includes('account');

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TradePilot-AI/1.0',
    };

    // Add authentication headers if needed
    if (needsAuth) {
      const requestPath = `/api/v5/dex/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      const authHeaders = getAuthHeaders('GET', requestPath);
      headers = { ...headers, ...authHeaders };
      console.log('Adding authentication headers for endpoint:', endpoint);
    }

    // Make the request from server-side (no CORS issues)
    const response = await fetch(okxUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OKX API responded with status: ${response.status}, body: ${errorText}`);
      throw new Error(`OKX API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('OKX Proxy API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from OKX API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const requestPath = `/api/v5/dex/${endpoint}`;
    const okxUrl = `https://web3.okx.com${requestPath}`;
    const bodyString = JSON.stringify(body);

    console.log(`Proxying POST request to: ${okxUrl}`);

    // Get authentication headers for POST requests
    const authHeaders = getAuthHeaders('POST', requestPath, bodyString);

    // Make the request from server-side (no CORS issues)
    const response = await fetch(okxUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'User-Agent': 'TradePilot-AI/1.0',
      },
      body: bodyString,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OKX API responded with status: ${response.status}, body: ${errorText}`);
      throw new Error(`OKX API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('OKX Proxy API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from OKX API' },
      { status: 500 }
    );
  }
}
