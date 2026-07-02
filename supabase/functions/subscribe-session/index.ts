const FLODESK_KEY = Deno.env.get('FLODESK_KEY') ?? '';
const SESSION_SEGMENT_ID = '6a465d9b1e9a4ac2df64e0fa';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { email } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = 'Basic ' + btoa(FLODESK_KEY + ':');

  // Upsert subscriber — response contains the ID needed for segment assignment
  const upsertRes = await fetch('https://api.flodesk.com/v1/subscribers', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const subscriber = await upsertRes.json();

  // Add to summer sessions segment
  await fetch(`https://api.flodesk.com/v1/subscribers/${subscriber.id}/segments`, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ segment_ids: [SESSION_SEGMENT_ID] }),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
