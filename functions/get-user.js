const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  try {
    const response = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
    });

    if (!response.ok) throw new Error(`JSONBin error: ${response.status}`);

    const data = await response.json();
    const userMap = data.record || data;

    return new Response(JSON.stringify(userMap), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load users' }), {
      status: 500, headers: corsHeaders
    });
  }
}
