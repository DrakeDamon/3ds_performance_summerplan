// 3DS owned lead-capture backend. POST /lead writes to D1 (owned data).
// GET /leads (Bearer ADMIN_TOKEN) reads them back for the 3DS Engine CRM.

const ALLOWED_ORIGINS = new Set([
  'https://3dsperformance.com',
  'https://www.3dsperformance.com',
  'https://drakedamon.github.io',
  'http://localhost:5173',
])

const cors = (origin) => {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://3dsperformance.com'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })

const cap = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null)

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })

    // ---- capture ----
    if (request.method === 'POST' && url.pathname === '/lead') {
      let b
      try { b = await request.json() } catch { return json({ ok: false, error: 'bad json' }, 400, origin) }

      // honeypot: bots fill hidden fields; humans don't
      if (b.company || b.website) return json({ ok: true }, 200, origin)
      if (!b.name && !b.email && !b.phone) return json({ ok: false, error: 'empty' }, 400, origin)

      try {
        await env.DB.prepare(
          `INSERT INTO leads (ts,name,email,phone,sport,interest,path,referrer,visitor_id,
             utm_source,utm_medium,utm_campaign,utm_term,utm_content,ip,ua)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          new Date().toISOString(),
          cap(b.name, 120), cap(b.email, 160), cap(b.phone, 40), cap(b.sport, 120),
          cap(b.interest, 40), cap(b.path, 200), cap(b.referrer, 300), cap(b.visitor_id, 64),
          cap(b.utm_source, 128), cap(b.utm_medium, 128), cap(b.utm_campaign, 128),
          cap(b.utm_term, 128), cap(b.utm_content, 128),
          request.headers.get('CF-Connecting-IP'),
          cap(request.headers.get('User-Agent'), 300),
        ).run()
      } catch (e) {
        return json({ ok: false, error: 'db' }, 500, origin)
      }
      return json({ ok: true }, 200, origin)
    }

    // ---- admin read (for the 3DS Engine CRM) ----
    if (request.method === 'GET' && url.pathname === '/leads') {
      const auth = request.headers.get('Authorization') || ''
      if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`)
        return json({ ok: false, error: 'unauthorized' }, 403, origin)
      const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all()
      return json({ ok: true, count: results.length, leads: results }, 200, origin)
    }

    if (url.pathname === '/' || url.pathname === '/health')
      return json({ ok: true, service: '3ds-leads' }, 200, origin)

    return json({ ok: false, error: 'not found' }, 404, origin)
  },
}
