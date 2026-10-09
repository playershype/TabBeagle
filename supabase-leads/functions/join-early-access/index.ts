// join-early-access: the only write path for early-access leads.
// Public endpoint (verify_jwt=false) by design: the landing page is static and anonymous.
// Writes go through the service role inside this function; the table has RLS and no policies.
// Deployed to project agobuvygxvjgkdecijyp (tabbeagle-leads) as version 1.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://tabbeagle.com,http://127.0.0.1:4173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const BUSINESS_TYPES = new Set([
  "Freelancer / consultant",
  "Agency",
  "Service business (contractor, cleaning, repair, etc.)",
  "Professional services",
  "Other",
]);
const VOLUMES = new Set(["1–20", "21–50", "51–150", "151–300", "More than 300"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY_BYTES = 4096;

// Per-instance throttle. Coarse flood protection only; durable limits belong at the edge (see README).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
let windowStart = 0;
let windowCount = 0;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function throttled(): boolean {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount > MAX_PER_WINDOW;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin === null || !ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden_origin" }, 403, origin);
  if (throttled()) return json({ error: "rate_limited" }, 429, origin);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: "invalid" }, 413, origin);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid" }, 400, origin);
  }

  // Honeypot: real users leave this empty.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ error: "invalid" }, 400, origin);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const businessType = typeof body.business_type === "string" ? body.business_type : "";
  const invoiceVolume = typeof body.invoice_volume === "string" ? body.invoice_volume : "";
  const painRaw = typeof body.pain_point === "string" ? body.pain_point.trim() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "landing";

  const valid =
    name.length >= 2 && name.length <= 120 &&
    email.length >= 3 && email.length <= 254 && EMAIL_RE.test(email) &&
    BUSINESS_TYPES.has(businessType) &&
    VOLUMES.has(invoiceVolume) &&
    painRaw.length <= 300 &&
    body.consent_marketing === true;

  if (!valid) return json({ error: "invalid" }, 400, origin);

  const { error } = await supabase.from("early_access_leads").insert({
    email_normalized: email,
    name,
    business_type: businessType,
    invoice_volume: invoiceVolume,
    pain_point: painRaw === "" ? null : painRaw,
    consent_at: new Date().toISOString(),
    source,
  });

  if (error) {
    // 23505 = unique_violation (email already on the list).
    if (error.code === "23505") return json({ error: "duplicate" }, 409, origin);
    console.error("insert_failed", error.code);
    return json({ error: "server" }, 500, origin);
  }

  return json({ ok: true }, 201, origin);
});
