const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

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
    const { userId, pictureUrl } = await request.json();

    if (!userId || !pictureUrl) {
      return new Response(JSON.stringify({ error: 'Missing userId or pictureUrl' }), {
        status: 400, headers: corsHeaders
      });
    }

    const getResponse = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
    });

    if (!getResponse.ok) throw new Error(`Fetch failed: ${getResponse.status}`);

    const data = await getResponse.json();
    const userMap = data.record || data;

    if (!userMap[userId]) {
      return new Response(JSON.stringify({ success: false, updated: false }), {
        status: 200, headers: corsHeaders
      });
    }

    if (userMap[userId].pictureUrl === pictureUrl) {
      return new Response(JSON.stringify({ success: true, updated: false }), {
        status: 200, headers: corsHeaders
      });
    }

    userMap[userId].pictureUrl = pictureUrl;
    userMap[userId].updatedAt = new Date().toISOString();

    const putResponse = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(userMap)
    });

    if (!putResponse.ok) throw new Error(`Update failed: ${putResponse.status}`);

    return new Response(JSON.stringify({ success: true, updated: true }), {
      status: 200, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
