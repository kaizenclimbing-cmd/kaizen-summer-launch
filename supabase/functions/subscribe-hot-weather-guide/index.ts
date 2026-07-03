const FLODESK_KEY = Deno.env.get('FLODESK_KEY') ?? '';
const SEGMENT_ID = '6a479b791e9a4ac2df650098';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { email } = await req.json();
  if (!email) return new Response(JSON.stringify({ error: 'Email required' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const auth = 'Basic ' + btoa(FLODESK_KEY + ':');

  const upsertRes = await fetch('https://api.flodesk.com/v1/subscribers', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const subscriber = await upsertRes.json();

  await fetch(`https://api.flodesk.com/v1/subscribers/${subscriber.id}/segments`, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ segment_ids: [SEGMENT_ID] }),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
