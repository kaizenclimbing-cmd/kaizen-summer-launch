import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DASHBOARD_SECRET = Deno.env.get('DASHBOARD_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FLODESK_KEY = Deno.env.get('FLODESK_KEY') ?? '';

// Segment IDs — replace null with real ID once segment is created in Flodesk
const SEGMENTS = [
  { label: 'Total waitlist',  id: '6a452f40ee8972aab8f36ac5', date: null },
  { label: 'Warmup email 1',  id: '6a46597d5074d2f12c6c09b0', date: '2026-07-02' },
  { label: 'Warmup email 2',  id: '6a465498aac17ab8566993b3', date: '2026-07-17' },
  { label: 'Warmup email 3',  id: null, date: '2026-07-21' },
  { label: 'Sales email 1',   id: null, date: '2026-08-01' },
  { label: 'Sales email 2',   id: null, date: '2026-08-03' },
  { label: 'Sales email 3',   id: null, date: '2026-08-06' },
  { label: 'Sales email 4',   id: null, date: '2026-08-09' },
  { label: 'Last chance',     id: null, date: '2026-08-10' },
];

async function fetchSegmentCount(id: string): Promise<number | null> {
  const res = await fetch(`https://api.flodesk.com/v1/segments/${id}`, {
    headers: { 'Authorization': 'Basic ' + btoa(FLODESK_KEY + ':') },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.total_active_subscribers ?? null;
}

async function fetchWaitlistSubscribers(): Promise<{ email: string; name: string; created_at: string }[]> {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.flodesk.com/v1/subscribers?segment_id=6a452f40ee8972aab8f36ac5&page=${page}&per_page=100`,
      { headers: { 'Authorization': 'Basic ' + btoa(FLODESK_KEY + ':') } }
    );
    if (!res.ok) break;
    const data = await res.json();
    all.push(...data.data.map((s: any) => ({
      email: s.email,
      name: [s.first_name, s.last_name].filter(Boolean).join(' ') || null,
      created_at: s.created_at,
    })));
    if (page >= data.meta.total_pages) break;
    page++;
  }
  return all;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-dashboard-secret, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const secret = req.headers.get('x-dashboard-secret');
  if (!secret || secret !== DASHBOARD_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const [{ data: rows, error }, waitlist, ...segmentCounts] = await Promise.all([
    supabase.from('summer_quiz_responses').select('*').order('created_at', { ascending: false }),
    fetchWaitlistSubscribers(),
    ...SEGMENTS.map(s => s.id ? fetchSegmentCount(s.id) : Promise.resolve(null)),
  ]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const segments = SEGMENTS.map((s, i) => ({
    label: s.label,
    date: s.date,
    count: segmentCounts[i],
    hasSegment: !!s.id,
  }));

  return new Response(JSON.stringify({ rows, segments, waitlist }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
