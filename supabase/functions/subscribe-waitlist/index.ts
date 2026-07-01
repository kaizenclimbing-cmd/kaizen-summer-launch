const FLODESK_KEY = Deno.env.get('FLODESK_KEY') ?? '';
const WAITLIST_SEGMENT_ID = '6a452f40ee8972aab8f36ac5';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { email, utm_source } = await req.json();

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = 'Basic ' + btoa(FLODESK_KEY + ':');

  // Upsert subscriber then add to segment
  await fetch('https://api.flodesk.com/v1/subscribers', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, custom_fields: { utm_source: utm_source ?? 'instagram' } }),
  });

  await fetch(`https://api.flodesk.com/v1/subscribers/${encodeURIComponent(email)}/segments`, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ segment_ids: [WAITLIST_SEGMENT_ID] }),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
