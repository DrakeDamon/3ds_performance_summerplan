import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import NumberFlow from '@number-flow/react'
import confetti from 'canvas-confetti'
import { Check, Star } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NavHeader, type NavItem } from '@/components/ui/nav-header'
import { MinimalFooter } from '@/components/ui/minimal-footer'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/glass-card'

/* ------------------------------------------------------------------ types */

interface Item {
  id: string
  name: string
  schedule: string
  featured?: boolean
  monthly?: number
  full?: number
  single?: number
  features: string[]
  links?: Record<string, string>
}
interface Group {
  label: string
  sub: string
  plans: string[]
  plan_labels: Record<string, string>
  items: Item[]
}
type Data = Record<string, Group>

/* ------------------------------------------------------------------ data
   The backend (/api/packages) is the source of truth. FALLBACK mirrors it
   (with links) so the page still renders if the API is briefly down.     */

const FALLBACK: Data = {
  summer: {
    label: 'Summer Speed & Power', sub: '8-week block · June–July',
    plans: ['monthly', 'full'], plan_labels: { monthly: 'Monthly', full: 'Pay in full' },
    items: [
      { id: 'summer-speed-strength', name: 'Speed + Strength', schedule: '2 gym + 1 speed / wk', monthly: 29900, full: 59800,
        features: ['2 gym strength & power sessions weekly', '1 speed session weekly', 'Force production & sprint mechanics', 'Specialty Lab access optional'],
        links: { monthly: 'https://buy.stripe.com/8x27sD7lZ0m47lu0FI1B60p', full: 'https://buy.stripe.com/9B63cn35JfgY35e2NQ1B60o' } },
      { id: 'summer-development', name: 'Development', schedule: '3 gym + 2 speed / wk', monthly: 39900, full: 79800,
        features: ['3 gym sessions weekly', '2 speed sessions weekly', '1 Specialty Lab credit monthly', 'Acceleration & max-velocity work'],
        links: { monthly: 'https://buy.stripe.com/cNieV57lZ5GobBK0FI1B60r', full: 'https://buy.stripe.com/dRm7sD6hVc4MgW49ce1B60q' } },
      { id: 'summer-performance', name: 'Performance', schedule: '4 gym + 2 speed / wk', featured: true, monthly: 49900, full: 99800,
        features: ['4 gym sessions weekly', '2 speed sessions weekly', '2 Specialty Lab credits monthly', 'Best balance of strength + speed transfer'],
        links: { monthly: 'https://buy.stripe.com/00w7sD8q3fgYeNW1JM1B60t', full: 'https://buy.stripe.com/00w4grcGj3ygbBK9ce1B60s' } },
      { id: 'summer-elite-power', name: 'Elite Power', schedule: '5 gym + 2 speed / wk', monthly: 62900, full: 125800,
        features: ['5 gym sessions weekly', '2 speed sessions weekly', '2 Specialty Lab credits monthly', 'For serious varsity, college & pro athletes'],
        links: { monthly: 'https://buy.stripe.com/14A4gr5dR5Go7lu7461B60v', full: 'https://buy.stripe.com/4gMfZ97lZc4MaxG3RU1B60u' } },
    ],
  },
  ongoing: {
    label: 'Year-Round Training', sub: 'After summer · 12-week blocks or month-to-month',
    plans: ['monthly', 'full'], plan_labels: { monthly: 'Monthly', full: '12-week block' },
    items: [
      { id: 'ongoing-maintenance', name: 'Maintenance', schedule: '3 gym + 1 speed / wk', monthly: 33000, full: 99000,
        features: ['3 gym sessions weekly', '1 speed session weekly', 'Keeps strength & speed in-season', 'Flexible around practice schedules'],
        links: { monthly: 'https://buy.stripe.com/5kQdR15dR1q8fS09ce1B60A', full: 'https://buy.stripe.com/7sYaEP49N4Ck6hqfAC1B60B' } },
      { id: 'ongoing-performance', name: 'Performance', schedule: '3 gym + 2 speed / wk', featured: true, monthly: 37500, full: 112500,
        features: ['3 gym sessions weekly', '2 speed sessions weekly', 'Off-season development focus', 'Testing & progress tracking'],
        links: { monthly: 'https://buy.stripe.com/cNi6oz35Jd8QcFO6021B60C', full: 'https://buy.stripe.com/bJeaEP0XBecUeNW7461B60D' } },
      { id: 'ongoing-college-pro', name: 'College/Pro Hybrid', schedule: '4 gym + 2 speed / wk', monthly: 40000, full: 120000,
        features: ['4 gym sessions weekly', '2 speed sessions weekly', 'Built for college & pro athletes', 'Highest weekly training exposure'],
        links: { monthly: 'https://buy.stripe.com/9B6aEP0XBb0IgW47461B60E', full: 'https://buy.stripe.com/bJeaEP5dR6KscFO0FI1B60F' } },
    ],
  },
  dropin: {
    label: 'Drop-Ins', sub: 'Space-available · max 2 per month before enrolling',
    plans: ['single'], plan_labels: { single: 'Per session' },
    items: [
      { id: 'dropin-speed', name: 'Speed Session', schedule: 'Single session', single: 2000,
        features: ['Acceleration, max velocity, COD', 'No gym membership needed'],
        links: { single: 'https://buy.stripe.com/4gM00b49N7OwbBK88a1B60w' } },
      { id: 'dropin-gym', name: 'Gym Session', schedule: 'Single session', single: 4000,
        features: ['Strength & power training', 'Gym day pass paid to gym'],
        links: { single: 'https://buy.stripe.com/7sY6ozgWz5Go6hq7461B60x' } },
      { id: 'dropin-lab', name: 'Specialty Lab', schedule: 'Single session', single: 4000,
        features: ['Sport-speed transfer work', 'Space available only'],
        links: { single: 'https://buy.stripe.com/3cI5kv5dR4Ck6hq3RU1B60y' } },
      { id: 'dropin-member-lab', name: 'Member Extra Lab', schedule: 'Single session', single: 3500,
        features: ['Enrolled athletes only', 'Beyond monthly lab credits'],
        links: { single: 'https://buy.stripe.com/8x2dR1bCf8SAcFObkm1B60z' } },
    ],
  },
}

const STATS = [
  { n: '13+', label: 'Athletes sent to college' },
  { n: '5+', label: 'Power 5 athletes developed' },
  { n: '4', label: 'Track athletes sent to state' },
  { n: '5', label: 'Track records broken' },
]

const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US')

/* Backend wiring. The API is called in dev (Vite proxies /api → :8000) or
   when a build-time VITE_API_BASE points at a hosted backend. On a plain
   static host (GitHub Pages) with no API base, run in "static mode": skip
   analytics calls entirely and send checkout straight to the public Stripe
   Payment Link — booking works with zero backend. */
const RAW_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
const USE_BACKEND = RAW_API_BASE !== '' || import.meta.env.DEV
const API_BASE = RAW_API_BASE.replace(/\/$/, '')

/* Resolve a /public asset against the Vite base path (works at the Pages
   subpath in builds and at / in dev). */
const asset = (p: string) => import.meta.env.BASE_URL + p

/* Acuity booking. Athletes reach Acuity AFTER paying — via /booked.html, which
   each Stripe Payment Link redirects to on completion (after_completion →
   redirect). booked.html holds both type links; App only needs SPEED for the
   post-signup "book a session" nudge in the lead form. No hand-sent links. */
const ACUITY_SPEED = 'https://app.acuityscheduling.com/schedule.php?owner=36021425&appointmentType=94339471'

/* Drop-in Stripe Payment Links — the Book section sends athletes HERE first (pay),
   then Stripe redirects to /booked.html?type=… → Acuity. Mirror of FALLBACK.dropin. */
const PAY_SPEED = 'https://buy.stripe.com/4gM00b49N7OwbBK88a1B60w' // $20 speed drop-in
const PAY_GYM = 'https://buy.stripe.com/7sY6ozgWz5Go6hq7461B60x'   // $40 gym drop-in

/* Owned lead list. Posts to a Cloudflare Worker → D1 (data lives in our own
   Cloudflare account, not a rented ESP). The form degrades gracefully if the
   endpoint is unreachable — it never dead-ends. Override via VITE_LEAD_ENDPOINT. */
const LEAD_ENDPOINT =
  (import.meta.env.VITE_LEAD_ENDPOINT as string | undefined) ?? 'https://api.3dsperformance.com/lead'

/* ------------------------------------------------------- metadata capture */

function visitorId(): string | null {
  try {
    let id = localStorage.getItem('3ds_vid')
    if (!id) {
      id = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(16).slice(2)
      localStorage.setItem('3ds_vid', id)
    }
    return id
  } catch {
    return null
  }
}

const UTM: Record<string, string> = (() => {
  const keys = ['source', 'medium', 'campaign', 'term', 'content']
  try {
    const q = new URLSearchParams(location.search)
    const fromUrl: Record<string, string> = {}
    for (const k of keys) {
      const v = q.get('utm_' + k)
      if (v) fromUrl['utm_' + k] = v.slice(0, 128)
    }
    if (Object.keys(fromUrl).length) {
      sessionStorage.setItem('3ds_utm', JSON.stringify(fromUrl))
      return fromUrl
    }
    const saved = sessionStorage.getItem('3ds_utm')
    if (saved) return JSON.parse(saved)
  } catch {
    /* storage blocked */
  }
  return {}
})()

const meta = () => ({
  path: location.pathname,
  referrer: document.referrer || null,
  screen: `${screen.width}x${screen.height}`,
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  visitor_id: visitorId(),
  ...UTM,
})

function track(kind: string) {
  if (!USE_BACKEND) return
  fetch(API_BASE + '/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...meta() }),
  }).catch(() => {})
}

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/* Brand confetti — fired when picking the pay-in-full plan, themed red/bone. */
function fireConfetti(x: number, y: number) {
  confetti({
    particleCount: 45,
    spread: 60,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: ['#e11d2a', '#f0f2f6', '#8f1218'],
    ticks: 160,
    gravity: 1.1,
    decay: 0.93,
    startVelocity: 28,
    shapes: ['circle'],
  })
}

/* ------------------------------------------------------------ components */

function Nav() {
  const navItems: NavItem[] = [
    { label: 'Book', onSelect: () => scrollToId('book') },
    { label: 'Programs', onSelect: () => scrollToId('programs') },
    { label: 'Coach', onSelect: () => scrollToId('coach') },
    { label: 'Courses', onSelect: () => scrollToId('courses') },
  ]
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <a href="#top" className="flex items-center gap-2.5" aria-label="3DS Performance home">
        <img src={asset('logo-white.png')} alt="3DS" className="h-7 w-auto" />
        <span className="hidden font-display text-lg uppercase tracking-tight sm:block">Performance</span>
      </a>
      <div className="hidden md:block">
        <NavHeader items={navItems} />
      </div>
      <Button
        onClick={() => scrollToId('book')}
        className="font-display uppercase tracking-wide"
      >
        Book
      </Button>
    </nav>
  )
}

function Hero() {
  return (
    <header id="top" className="mx-auto max-w-6xl px-4 pt-14 pb-8 md:px-8 md:pt-20">
      <p className="rise-in text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Wesley Chapel, FL · @3ds_performance
      </p>
      <h1 className="mt-4 font-display text-5xl italic uppercase leading-[0.95] tracking-tight md:text-7xl">
        {['Train fast.', 'Get strong.', 'Transfer it to sport.'].map((line, i) => (
          <span
            key={line}
            className={cn('rise-in block', i === 1 && 'text-primary')}
            style={{ animationDelay: `${0.08 + i * 0.08}s` }}
          >
            {line}
          </span>
        ))}
      </h1>
      <p
        className="rise-in mt-6 max-w-xl text-base text-muted-foreground md:text-lg"
        style={{ animationDelay: '0.3s' }}
      >
        Speed, strength &amp; athletic development for high school, college, and
        professional athletes.
      </p>

      <p className="mt-10 font-display text-sm italic uppercase tracking-wide text-muted-foreground">
        2 year results
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3" role="list">
        {STATS.map((s) => (
          <div
            key={s.label} role="listitem"
            className="skew-brand border-l-2 border-primary bg-card/60 px-5 py-3 backdrop-blur-sm"
          >
            <div className="unskew-brand">
              <span className="block font-display text-2xl md:text-3xl">{s.n}</span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </header>
  )
}

function GymGlassNote() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8">
      <GlassCard className="border-primary/30">
        <GlassCardHeader>
          <GlassCardTitle className="font-display text-lg uppercase tracking-tight text-white">
            Gym membership is separate
          </GlassCardTitle>
          <GlassCardDescription className="text-white/85">
            Every enrolled athlete signs up for the morning fitness gym membership
            (<b className="font-semibold text-white">$40/mo</b>) directly with the gym.
            Prices below cover 3DS training only.
          </GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    </div>
  )
}

/* ---- Booking: the $20/$40 first-session tripwire (Acuity scheduling) ---- */
function BookingSection() {
  const cards = [
    {
      name: 'Speed Session', price: '$20', href: PAY_SPEED,
      lines: ['Acceleration, max-velocity & sprint mechanics', 'Field work — no gym membership needed'],
      kind: 'book_speed',
    },
    {
      name: 'Gym Session', price: '$40', href: PAY_GYM,
      lines: ['Strength, power & force production', 'Train where college & pro athletes train'],
      kind: 'book_gym',
    },
  ]
  return (
    <section id="book" className="mx-auto max-w-6xl px-4 md:px-8">
      <h2 className="font-display text-3xl uppercase tracking-tight md:text-4xl">Book your first session</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        New here? Drop in for one session and see how we coach before you commit to a block.
        Reserve your spot below — pay, then pick your time right after. We handle the rest.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <article
            key={c.name}
            style={{ animationDelay: `${i * 0.06}s` }}
            className="rise-in flex flex-col rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl uppercase tracking-tight">{c.name}</h3>
              <span className="font-display text-2xl text-primary">{c.price}</span>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {c.lines.map((l) => (
                <li key={l} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <a
              href={c.href} target="_blank" rel="noopener noreferrer"
              onClick={() => track(c.kind)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 font-display text-sm uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
            >
              Reserve {c.name.split(' ')[0]} — {c.price}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ---- Coach: the human behind the standard (parents/decision-makers vet this) ---- */
function CoachSection() {
  return (
    <section id="coach" className="mx-auto max-w-5xl px-4 md:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr] md:items-center">
        <div className="rise-in mx-auto w-full max-w-[260px]">
          <img
            src={asset('coach.jpg')}
            alt="Coach Drake Damon, 3DS Performance"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = asset('logo-white.png') }}
            className="aspect-[4/5] w-full rounded-2xl border border-border bg-card/60 object-cover"
          />
        </div>
        <div className="rise-in" style={{ animationDelay: '0.08s' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The coach</p>
          <h2 className="mt-2 font-display text-3xl uppercase tracking-tight md:text-4xl">
            Coached by Drake Damon
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            3DS isn&apos;t a class you get filed into. Every athlete is coached to a standard —
            the same speed, strength &amp; biomechanics system that has sent 13+ athletes to
            college, developed 5+ Power&nbsp;5 athletes, and put 4 on the state track stage with
            5 records broken. Two years. One gym in Wesley Chapel.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            The method is simple and it&apos;s why it transfers: speed is built from the ground
            up — foot, hip, force. We measure it, we coach the mechanics, and we hold athletes to
            what the next level actually demands.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---- Reusable owned-list capture form (schedule + course waitlist) ---- */
function LeadForm({
  id, interest, heading, blurb, cta,
}: {
  id: string
  interest: string
  heading: string
  blurb: string
  cta: string
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', phone: '', sport: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    track(`lead_${interest}`)
    try {
      const r = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          interest,
          path: location.pathname,
          referrer: document.referrer || null,
          visitor_id: visitorId(),
          ...UTM,
        }),
      })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-primary/40 bg-card/80 p-6 text-center backdrop-blur-sm">
        <Check className="mx-auto size-8 text-primary" />
        <h3 className="mt-3 font-display text-xl uppercase tracking-tight">You&apos;re on the list</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll send the schedule and details shortly. Want a spot now?{' '}
          <a href={ACUITY_SPEED} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Book a session
          </a>.
        </p>
      </div>
    )
  }

  return (
    <form id={id} onSubmit={submit} className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
      <h3 className="font-display text-2xl uppercase tracking-tight md:text-3xl">{heading}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          required value={form.name} onChange={set('name')} placeholder="Athlete or parent name"
          className="rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          required type="email" value={form.email} onChange={set('email')} placeholder="Email"
          className="rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="tel" value={form.phone} onChange={set('phone')} placeholder="Phone (for the schedule text)"
          className="rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          value={form.sport} onChange={set('sport')} placeholder="Sport / level (e.g. HS WR, college 400m)"
          className="rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit" disabled={state === 'sending'}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 font-display text-sm uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : cta}
      </button>
      {state === 'error' && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Something glitched. DM <a href="https://www.instagram.com/3ds_performance/" target="_blank" rel="noopener noreferrer" className="text-primary underline">@3ds_performance</a> or{' '}
          <a href={ACUITY_SPEED} target="_blank" rel="noopener noreferrer" className="text-primary underline">book a session</a> and we&apos;ll get you the schedule.
        </p>
      )}
    </form>
  )
}

/* ---- Course library teaser (own it — no TrainHeroic rev-share) ---- */
function CoursesComingSoon() {
  return (
    <section id="courses" className="mx-auto max-w-3xl px-4 md:px-8">
      <div className="rounded-2xl border border-border bg-card/60 p-6 text-center backdrop-blur-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">3DS Course Library</p>
        <h2 className="mt-2 font-display text-3xl uppercase tracking-tight md:text-4xl">
          Train with us from anywhere
          <span className="ml-2 align-middle text-base text-muted-foreground">(coming soon)</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          The speed, strength &amp; biomechanics system — broken into on-demand courses you can run
          on your own. Built and owned by 3DS. Join the list and you&apos;ll be first in when it drops.
        </p>
        <div className="mx-auto mt-6 max-w-xl text-left">
          <LeadForm
            id="courses-waitlist"
            interest="courses"
            heading="Get early access"
            blurb="No spam — one note when the first course goes live."
            cta="Join the waitlist"
          />
        </div>
      </div>
    </section>
  )
}

function PriceCard({
  item, plan, planLabels, group, index, onCheckout,
}: {
  item: Item
  plan: string
  planLabels: Record<string, string>
  group: string
  index: number
  onCheckout: (item: Item, plan: string) => void
}) {
  const altPlan = plan === 'monthly' ? 'full' : 'monthly'
  const showAlt = plan !== 'single' && item[altPlan as keyof Item] != null && planLabels[altPlan]
  const cents = (item[plan as keyof Item] as number) ?? 0
  const cycle = plan === 'monthly' ? '/ mo' : plan === 'full' ? 'total' : '/ session'

  return (
    <article
      style={{ animationDelay: `${index * 0.06}s` }}
      className={cn(
        'rise-in relative flex flex-col rounded-2xl border bg-card/80 p-5 backdrop-blur-sm md:p-6',
        item.featured
          ? 'border-2 border-primary shadow-[0_0_40px_-12px_hsl(var(--primary)/0.5)]'
          : 'border-border',
      )}
    >
      {item.featured && (
        <div className="absolute -top-px right-5 flex -translate-y-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          <Star className="size-3.5 fill-current" />
          Most popular
        </div>
      )}
      <h3 className="font-display text-xl uppercase tracking-tight">{item.name}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{item.schedule}</p>

      <div className="mt-5 flex items-end gap-1.5">
        <span className="font-display text-4xl leading-none tracking-tight">
          <NumberFlow
            value={cents / 100}
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
            transformTiming={{ duration: 500, easing: 'ease-out' }}
            willChange
          />
        </span>
        <span className="pb-1 text-sm font-semibold text-muted-foreground">{cycle}</span>
      </div>
      {showAlt && (
        <p className="mt-1 text-xs text-muted-foreground">
          or {fmt(item[altPlan as keyof Item] as number)} {planLabels[altPlan].toLowerCase()}
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2">
        {item.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 flex-shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onCheckout(item, plan)}
        variant={item.featured ? 'default' : 'outline'}
        className="mt-6 w-full font-display uppercase tracking-wide"
      >
        {group === 'dropin' ? 'Book session' : 'Enroll now'}
      </Button>
    </article>
  )
}

function ProgramSection({
  groupKey, group, onCheckout,
}: {
  groupKey: string
  group: Group
  onCheckout: (item: Item, plan: string) => void
}) {
  const [plan, setPlan] = useState(group.plans[0])
  const effectivePlan = group.plans.includes(plan) ? plan : group.plans[0]

  const selectPlan = (p: string, e: React.MouseEvent) => {
    setPlan(p)
    track('toggle')
    if (p !== 'monthly') fireConfetti(e.clientX, e.clientY)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8" id={groupKey === 'dropin' ? 'dropins' : undefined}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl uppercase tracking-tight md:text-4xl">{group.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{group.sub}</p>
        </div>
        {group.plans.length > 1 && (
          <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur-sm" role="tablist" aria-label="Billing">
            {group.plans.map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={effectivePlan === p}
                onClick={(e) => selectPlan(p, e)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors',
                  effectivePlan === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {group.plan_labels[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {group.items.map((item, i) => (
          <PriceCard
            key={item.id}
            item={item}
            plan={effectivePlan}
            planLabels={group.plan_labels}
            group={groupKey}
            index={i}
            onCheckout={onCheckout}
          />
        ))}
      </div>
    </section>
  )
}

const TABS = [
  { key: 'summer', label: 'Summer Program' },
  { key: 'ongoing', label: 'Year-Round' },
  { key: 'dropin', label: 'Drop-Ins' },
]

export default function App() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [tab, setTab] = useState('summer')

  useEffect(() => {
    track('pageview')
    if (!USE_BACKEND) return // static host: FALLBACK is the catalog
    fetch(API_BASE + '/api/packages')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((api: Data) => {
        setData((prev) => {
          const merged: Data = {}
          for (const k of Object.keys(prev)) {
            merged[k] = {
              ...prev[k],
              ...api[k],
              items: api[k].items.map((it) => ({
                ...prev[k].items.find((p) => p.id === it.id),
                ...it,
              })),
            }
          }
          return merged
        })
      })
      .catch(() => {})
  }, [])

  const onCheckout = useMemo(
    () => (item: Item, plan: string) => {
      const direct = item.links?.[plan]
      // Static host: no backend to log the click — go straight to Stripe.
      if (!USE_BACKEND) {
        if (direct) window.location.href = direct
        return
      }
      fetch(API_BASE + '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: item.id, plan, ...meta() }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(({ url }) => { window.location.href = url })
        .catch(() => {
          if (direct) window.location.href = direct
        })
    },
    [],
  )

  const onTab = (k: string) => { setTab(k); track('tab') }

  return (
    <>
      <div className="brand-bg" aria-hidden="true" />
      <Nav />
      {/* Block + space-y (not flex): children use mx-auto to center, which
          shrinks them to content width inside a flex column. */}
      <main className="space-y-14 pb-4">
        <Hero />
        <BookingSection />
        <CoachSection />
        <GymGlassNote />

        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1 px-4 md:px-8" id="programs" role="tablist" aria-label="Programs">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => onTab(t.key)}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors',
                tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {tab === t.key && (
                <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <ProgramSection groupKey={tab} group={data[tab]} onCheckout={onCheckout} />

        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <LeadForm
            id="schedule"
            interest="schedule"
            heading="Get the Summer Schedule"
            blurb="Full session times, pricing, and how enrollment works — sent straight to you."
            cta="Send me the schedule"
          />
        </div>

        <CoursesComingSoon />
      </main>
      <MinimalFooter />
    </>
  )
}
