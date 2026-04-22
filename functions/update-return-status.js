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
    const { carPlate, returnedAt, durationText, returnLocation } = await request.json();

    if (!carPlate) {
      return new Response(JSON.stringify({ error: 'Missing carPlate' }), {
        status: 400, headers: corsHeaders
      });
    }

    const getResponse = await fetch(`${JSONBIN_API}/${env.RECORDS_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch records: ${getResponse.status}`);
    }

    const binData = await getResponse.json();
    let records = [];

    if (binData.record && Array.isArray(binData.record.records)) records = binData.record.records;
    else if (binData.records && Array.isArray(binData.records)) records = binData.records;
    else if (Array.isArray(binData)) records = binData;

    let targetIndex = -1;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].car === carPlate) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      return new Response(JSON.stringify({ success: false, error: 'Record not found' }), {
        status: 404, headers: corsHeaders
      });
    }

    records[targetIndex].returnStatus = 'returned';
    records[targetIndex].returnedAt = returnedAt || new Date().toISOString();
    records[targetIndex].durationText = durationText || '';
    records[targetIndex].returnLocation = returnLocation || null;

    const putResponse = await fetch(`${JSONBIN_API}/${env.RECORDS_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify({ records })
    });

    if (!putResponse.ok) {
      throw new Error(`Failed to update records: ${putResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
