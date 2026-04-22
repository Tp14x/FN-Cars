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
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    let userMap = {};
    try {
      const userResponse = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userMap = userData.record || userData;
      }
    } catch (_) {}

    let oldRecords = [];
    try {
      const oldResponse = await fetch(`${JSONBIN_API}/${env.OLD_RECORDS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
      });
      if (oldResponse.ok) {
        const oldData = await oldResponse.json();
        if (oldData.record && oldData.record.records) oldRecords = oldData.record.records;
        else if (oldData.records) oldRecords = oldData.records;
        else if (Array.isArray(oldData)) oldRecords = oldData;
        else if (oldData.record && Array.isArray(oldData.record)) oldRecords = oldData.record;
      }
    } catch (_) {}

    let newRecords = [];
    try {
      const newResponse = await fetch(`${JSONBIN_API}/${env.RECORDS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }
      });
      if (newResponse.ok) {
        const newData = await newResponse.json();
        if (newData.record && newData.record.records) newRecords = newData.record.records;
        else if (newData.records) newRecords = newData.records;
        else if (Array.isArray(newData)) newRecords = newData;
      }
    } catch (_) {}

    const allRecords = [...oldRecords, ...newRecords];
    const formattedRecords = allRecords.map(record => {
      let pictureUrl = null;
      if (record.userId && userMap[record.userId] && userMap[record.userId].pictureUrl) {
        pictureUrl = userMap[record.userId].pictureUrl;
      } else if (record.pictureUrl) {
        pictureUrl = record.pictureUrl;
      }

      return {
        _id: record._id || record.id || String(Date.now()),
        name: record.name || record.originalName || record.displayName || 'ไม่ระบุชื่อ',
        phone: record.phone || '-',
        car: record.car || 'ไม่ระบุ',
        mileage: record.mileage || '0',
        reason: record.reason || '-',
        totalDistance: record.totalDistance || 0,
        totalTime: record.totalTime || 0,
        timestamp: record.timestamp || new Date().toISOString(),
        destinations: record.destinations || [],
        hasPhoto: record.hasPhoto || false,
        routeText: record.routeText || '',
        pictureUrl: pictureUrl || null,
        returnStatus: record.returnStatus || 'returned'
      };
    });

    formattedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return new Response(JSON.stringify(formattedRecords), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
