const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // ✅ รองรับทั้ง GET และ POST
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  // ✅ ถ้าเป็น GET ให้ตอบกลับสถานะ
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: 'Log-login function is working',
      timestamp: new Date().toISOString()
    }), {
      status: 200, headers: corsHeaders
    });
  }

  // POST logic (บันทึก login log)
  try {
    const loginData = await request.json();
    const key = env.JSONBIN_MASTER_KEY;

    let logs = [];
    try {
      const data = await fetchBin(env.OLD_RECORDS_BIN_ID, key);
      if (data.logs) logs = data.logs;
      else if (Array.isArray(data)) logs = data;
      else logs = [];
    } catch (_) {}

    logs.unshift({
      ...loginData,
      timestamp: new Date().toISOString()
    });

    if (logs.length > 1000) logs = logs.slice(0, 1000);
    await putBin(env.OLD_RECORDS_BIN_ID, key, { logs });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
