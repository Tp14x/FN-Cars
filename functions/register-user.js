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
    const userData = await request.json();

    if (!userData.userId || !userData.displayName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, displayName' }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User registered successfully',
        userId: userData.userId,
        requiresApproval: true
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to register user' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
