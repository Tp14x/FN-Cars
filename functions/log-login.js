const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  try {
    const loginData = await request.json();

    loginData.serverTimestamp = new Date().toISOString();
    loginData.ip = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')
      || 'unknown';

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login logged successfully',
        timestamp: loginData.serverTimestamp
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to log login' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
