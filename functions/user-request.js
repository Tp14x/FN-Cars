const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

async function fetchBin(binId, masterKey) {
  const res = await fetch(`${JSONBIN_API}/${binId}/latest`, {
    headers: { 'X-Master-Key': masterKey, 'X-Bin-Meta': 'false' }
  });
  if (!res.ok) throw new Error(`Fetch ${binId} failed: ${res.status}`);
  const data = await res.json();
  return data.record || data;
}

async function putBin(binId, masterKey, payload) {
  const res = await fetch(`${JSONBIN_API}/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': masterKey },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Put ${binId} failed: ${res.status}`);
  return true;
}

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
    const { action, userId, displayName, pictureUrl, formData } = body;

    const key = env.JSONBIN_MASTER_KEY;

    if (action === 'check') {
      try {
        const requests = await fetchBin(env.REQUEST_BIN_ID, key);
        const requestsList = Array.isArray(requests) ? requests : Object.values(requests);
        const exists = requestsList.some(r => r.userData && r.userData.userId === userId);
        return new Response(JSON.stringify({ exists }), {
          status: 200, headers: corsHeaders
        });
      } catch (_) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200, headers: corsHeaders
        });
      }
    }

    if (action === 'submit') {
      const requests = await fetchBin(env.REQUEST_BIN_ID, key);
      const requestsList = Array.isArray(requests) ? requests : Object.values(requests);
      
      const existing = requestsList.find(r => r.userData && r.userData.userId === userId);
      if (existing) {
        return new Response(JSON.stringify({ duplicate: true }), {
          status: 200, headers: corsHeaders
        });
      }

      const newRequest = {
        id: Date.now(),
        userData: { userId, displayName, pictureUrl, ...formData },
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      const updated = [...requestsList, newRequest];
      await putBin(env.REQUEST_BIN_ID, key, updated);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
