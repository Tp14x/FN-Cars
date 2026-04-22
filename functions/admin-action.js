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
    const { action, requestingUserId } = body;

    if (requestingUserId !== env.ADMIN_USER_ID) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403, headers: corsHeaders
      });
    }

    const key = env.JSONBIN_MASTER_KEY;

    if (action === 'load') {
      const userMap = await fetchBin(env.USER_BIN_ID, key);
      let requests = [];
      try {
        const rawRequests = await fetchBin(env.REQUEST_BIN_ID, key);
        requests = Array.isArray(rawRequests) ? rawRequests : Object.values(rawRequests);
      } catch (_) {}
      return new Response(JSON.stringify({ userMap, requests }), {
        status: 200, headers: corsHeaders
      });
    }

    if (action === 'approve') {
      const { userId, userData } = body;
      const userMap = await fetchBin(env.USER_BIN_ID, key);
      userMap[userId] = { ...userMap[userId], ...userData, status: 'active', approvedAt: new Date().toISOString() };
      await putBin(env.USER_BIN_ID, key, userMap);

      const rawRequests = await fetchBin(env.REQUEST_BIN_ID, key);
      const requests = Array.isArray(rawRequests) ? rawRequests : Object.values(rawRequests);
      const updated = requests.map(r =>
        r && r.userData && r.userData.userId === userId ? { ...r, status: 'approved' } : r
      );
      await putBin(env.REQUEST_BIN_ID, key, updated);

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    if (action === 'reject') {
      const { userId } = body;
      const rawRequests = await fetchBin(env.REQUEST_BIN_ID, key);
      const requests = Array.isArray(rawRequests) ? rawRequests : Object.values(rawRequests);
      const updated = requests.map(r =>
        r && r.userData && r.userData.userId === userId ? { ...r, status: 'rejected' } : r
      );
      await putBin(env.REQUEST_BIN_ID, key, updated);

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    if (action === 'save') {
      const { userId, userData } = body;
      const userMap = await fetchBin(env.USER_BIN_ID, key);
      userMap[userId] = { ...(userMap[userId] || {}), ...userData, updatedAt: new Date().toISOString() };
      await putBin(env.USER_BIN_ID, key, userMap);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    if (action === 'toggle') {
      const { userId } = body;
      const userMap = await fetchBin(env.USER_BIN_ID, key);
      if (!userMap[userId]) throw new Error('User not found');
      const current = userMap[userId].status || 'active';
      userMap[userId].status = current === 'active' ? 'inactive' : 'active';
      await putBin(env.USER_BIN_ID, key, userMap);
      return new Response(JSON.stringify({ success: true, newStatus: userMap[userId].status }), {
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
