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
    const body = await request.json();
    const { action } = body;

    const getResponse = await fetch(`${JSONBIN_API}/${env.REQUEST_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
    });

    let existingRequests = [];
    if (getResponse.ok) {
      const data = await getResponse.json();
      if (Array.isArray(data)) existingRequests = data;
      else if (data.record && Array.isArray(data.record)) existingRequests = data.record;
      else if (data && typeof data === 'object') existingRequests = Object.values(data);
    }

    if (action === 'check') {
      const { userId } = body;
      const exists = existingRequests.some(
        req => req && req.userData && req.userData.userId === userId && req.status === 'pending'
      );
      return new Response(JSON.stringify({ exists }), { status: 200, headers: corsHeaders });
    }

    if (action === 'submit' || action === 'request') {
      const { userId, displayName, pictureUrl, formData } = body;

      const alreadyExists = existingRequests.find(
        req => req && req.userData && req.userData.userId === userId
      );
      if (alreadyExists) {
        return new Response(JSON.stringify({ success: false, duplicate: true }), {
          status: 200, headers: corsHeaders
        });
      }

      const newRequest = {
        id: Date.now().toString(),
        type: 'ผู้สมัครใช้งานใหม่',
        userData: {
          userId,
          displayName,
          pictureUrl: pictureUrl || null,
          ...(formData || {})
        },
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      existingRequests.push(newRequest);

      const putResponse = await fetch(`${JSONBIN_API}/${env.REQUEST_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': env.JSONBIN_MASTER_KEY
        },
        body: JSON.stringify(existingRequests)
      });

      if (!putResponse.ok) throw new Error(`Save failed: ${putResponse.status}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
