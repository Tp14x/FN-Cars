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
    const data = await request.json();

    let existingRecords = [];
    const getResponse = await fetch(`${JSONBIN_API}/${env.RECORDS_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
    });

    if (getResponse.ok) {
      const binData = await getResponse.json();
      if (binData.record && Array.isArray(binData.record.records)) existingRecords = binData.record.records;
      else if (binData.record && Array.isArray(binData.record)) existingRecords = binData.record;
      else if (binData.records && Array.isArray(binData.records)) existingRecords = binData.records;
      else if (Array.isArray(binData)) existingRecords = binData;
      else if (binData.record && !Array.isArray(binData.record)) existingRecords = [binData.record];
    }

    const newRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: data.userId || 'unknown',
      name: data.mappedName || data.name || data.displayName || 'ไม่ระบุชื่อ',
      phone: data.phone || '-',
      car: data.car || '-',
      mileage: data.mileage || '0',
      reason: data.reason || '',
      routeText: data.routeText || '',
      destinations: data.destinations || [],
      totalDistance: data.totalDistance || 0,
      totalTime: data.totalTime || 0,
      hasPhoto: data.hasPhoto || false,
      returnStatus: 'pending'
    };

    existingRecords.push(newRecord);

    const putResponse = await fetch(`${JSONBIN_API}/${env.RECORDS_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify({ records: existingRecords })
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`Save failed: ${putResponse.status} - ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: newRecord.id, total: existingRecords.length }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
