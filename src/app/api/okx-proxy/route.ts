import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { globalRateLimiter } from '../../../lib/rate-limiter';

// Authentication helper functions for OKX API
function createSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
  const secretKey = process.env.OKX_SECRET_KEY || '';
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function getAuthHeaders(method: string, requestPath: string, body: string = '') {
  const apiKey = process.env.OKX_API_KEY || '';
  const passphrase = process.env.OKX_API_PASSPHRASE || '';
  const timestamp = new Date().toISOString();
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
  return globalRateLimiter.executeRequest(async () => {
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

      console.log(`Making OKX DEX API request to: ${okxUrl} (via GET proxy)`);

      // Most OKX DEX endpoints need authentication for production use
      // Only skip auth for truly public endpoints
      const skipAuth = endpoint === 'market/supported/chain' && !process.env.OKX_API_KEY;

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'TradePilot-AI/1.0',
      };

      // Add authentication headers for most endpoints
      if (!skipAuth && process.env.OKX_API_KEY) {
        const requestPath = `/api/v5/dex/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
        const authHeaders = getAuthHeaders('GET', requestPath);
        headers = { ...headers, ...authHeaders };
        console.log('Adding authentication headers for endpoint:', endpoint);
      } else if (!process.env.OKX_API_KEY) {
        console.warn('OKX API credentials not configured - some endpoints may fail');
      }

      // Make the request from server-side (no CORS issues)
      const response = await fetch(okxUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OKX API responded with status: ${response.status}, body: ${errorText}`);

        // For rate limit errors, return them immediately so the client can handle them
        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded - please try again later', code: '50011' },
            { status: 429 }
          );
        }

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
  });
}

export async function POST(request: NextRequest) {
  return globalRateLimiter.executeRequest(async () => {
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

      console.log(`Making OKX DEX API request to: ${okxUrl} (via POST proxy)`);
      console.log(`Request body contains ${Array.isArray(body) ? body.length : 1} item(s)`);

      // Validate batch request size (OKX supports up to 20 tokens per batch)
      if (Array.isArray(body) && body.length > 20) {
        return NextResponse.json(
          { error: 'Maximum 20 tokens allowed per batch request' },
          { status: 400 }
        );
      }

      // Always add authentication headers for POST requests if credentials are available
      let authHeaders = {};
      if (process.env.OKX_API_KEY) {
        authHeaders = getAuthHeaders('POST', requestPath, bodyString);
        console.log('Adding authentication headers for batch request');
      } else {
        console.warn('OKX API credentials not configured for POST request');
      }

      // Make the request from server-side (no CORS issues)
      const response = await fetch(okxUrl, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'User-Agent': 'TradePilot-AI/1.0',
        },
        body: bodyString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OKX API responded with status: ${response.status}, body: ${errorText}`);

        // Provide more specific error messages
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Authentication failed - check OKX API credentials' },
            { status: 401 }
          );
        } else if (response.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded - please try again later' },
            { status: 429 }
          );
        }

        throw new Error(`OKX API responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Log success info for batch requests
      if (data.code === '0' && Array.isArray(data.data)) {
        console.log(`✅ Successfully fetched prices for ${data.data.length} tokens`);
      }

      return NextResponse.json(data);

    } catch (error) {
      console.error('OKX Proxy API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data from OKX API' },
        { status: 500 }
      );
    }
  });
}
