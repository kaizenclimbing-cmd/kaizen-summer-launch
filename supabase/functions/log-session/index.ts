import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_KEY') ?? '';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { email, fingers, bouldering, pullups, notes } = await req.json();

  if (!email) return new Response(JSON.stringify({ error: 'Email required' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  // Save to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.from('session_logs').insert({ email, fingers, bouldering, pullups, notes });

  // Send email summary via Resend
  if (RESEND_KEY) {
    const fingersText = fingers?.sets?.map((s: any, i: number) =>
      `Set ${i + 1}: ${s.weight ? s.weight + 'kg' : 'bodyweight'} × ${s.duration ?? 7}s${s.completed ? ' ✓' : ''}`
    ).join('\n') ?? 'Not logged';

    const pullupText = pullups?.sets?.map((s: any, i: number) =>
      `Set ${i + 1}: ${s.reps ?? '–'} reps${s.weight ? ' +' + s.weight + 'kg' : ''}${s.completed ? ' ✓' : ''}`
    ).join('\n') ?? 'Not logged';

    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1e1c14;padding:32px 24px;">
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#c8a84b;margin-bottom:32px;">Kaizen Climbing</p>
        <h1 style="font-size:1.6rem;margin-bottom:8px;">Session logged.</h1>
        <p style="color:#555;margin-bottom:32px;">Here's what you did today.</p>

        <h2 style="font-size:1rem;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px;">01 — Fingers</h2>
        <pre style="font-family:system-ui;font-size:0.9rem;color:#333;white-space:pre-wrap;">${fingersText}</pre>

        <h2 style="font-size:1rem;border-bottom:1px solid #eee;padding-bottom:8px;margin:24px 0 12px;">02 — Bouldering</h2>
        <p style="font-size:0.9rem;color:#333;">${bouldering?.notes || 'Completed'}</p>

        <h2 style="font-size:1rem;border-bottom:1px solid #eee;padding-bottom:8px;margin:24px 0 12px;">03 — Pull-ups</h2>
        <pre style="font-family:system-ui;font-size:0.9rem;color:#333;white-space:pre-wrap;">${pullupText}</pre>

        ${notes ? `<h2 style="font-size:1rem;border-bottom:1px solid #eee;padding-bottom:8px;margin:24px 0 12px;">Notes</h2><p style="font-size:0.9rem;color:#333;">${notes}</p>` : ''}

        <p style="margin-top:40px;font-size:0.85rem;color:#888;">— Buster<br>Kaizen Climbing</p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Buster <buster@notify.kaizenclimbing.com>',
        to: [email],
        subject: 'Session logged — nice work.',
        html,
      }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
