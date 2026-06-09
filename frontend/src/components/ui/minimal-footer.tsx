/* lucide-react dropped brand/logo icons (Instagram, etc.) for trademark
   reasons, so the Instagram glyph is inlined here. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/* Minimal footer (21st.dev), re-themed to 3DS with the brand's real
   content: actual program anchors, the real Instagram, and the legal /
   gym-membership disclaimers carried over from the original site footer.
   No fabricated social links. */
export function MinimalFooter() {
  const year = new Date().getFullYear();

  const programs = [
    { title: "Summer Program", href: "#programs" },
    { title: "Year-Round", href: "#programs" },
    { title: "Drop-Ins", href: "#dropins" },
    { title: "Enroll", href: "#programs" },
  ];

  const info = [
    { title: "DM @3ds_performance", href: "https://www.instagram.com/3ds_performance/" },
    { title: "Wesley Chapel, FL", href: "#top" },
  ];

  return (
    <footer className="relative mt-12">
      <div className="bg-[radial-gradient(35%_80%_at_30%_0%,hsl(var(--foreground)/0.08),transparent)] mx-auto max-w-4xl md:border-x">
        <div className="bg-border absolute inset-x-0 h-px w-full" />
        <div className="grid max-w-4xl grid-cols-6 gap-6 p-6">
          <div className="col-span-6 flex flex-col gap-5 md:col-span-4">
            <a href="#top" className="w-max" aria-label="3DS Performance home">
              {/* BASE_URL prefix so the logo resolves at the GitHub Pages subpath too */}
              <img src={import.meta.env.BASE_URL + 'logo-white.png'} alt="3DS Performance" className="h-9 w-auto opacity-90" />
            </a>
            <p className="text-muted-foreground max-w-sm text-sm text-balance">
              Speed, strength &amp; athletic development for high school,
              college, and professional athletes. Wesley Chapel, FL.
            </p>
            <div className="flex gap-2">
              <a
                className="hover:bg-accent hover:text-accent-foreground rounded-md border p-1.5 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.instagram.com/3ds_performance/"
                aria-label="Instagram"
              >
                <InstagramGlyph className="size-4" />
              </a>
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground mb-1 block text-xs uppercase tracking-wide">
              Programs
            </span>
            <div className="flex flex-col gap-1">
              {programs.map(({ href, title }, i) => (
                <a key={i} className="w-max py-1 text-sm duration-200 hover:underline" href={href}>
                  {title}
                </a>
              ))}
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground mb-1 block text-xs uppercase tracking-wide">
              Contact
            </span>
            <div className="flex flex-col gap-1">
              {info.map(({ href, title }, i) => (
                <a
                  key={i}
                  className="w-max py-1 text-sm duration-200 hover:underline"
                  href={href}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-border absolute inset-x-0 h-px w-full" />
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 pt-4 pb-6 text-center">
          <p className="text-muted-foreground text-xs">
            Prices cover 3DS training only. The $40/mo morning fitness gym
            membership is paid directly to the gym. Monthly plans bill until
            canceled; drop-ins are space-available, max 2 per month.
          </p>
          <p className="text-muted-foreground text-xs opacity-75">
            Secure checkout powered by Stripe
          </p>
          <p className="text-muted-foreground text-xs font-thin">
            © 3DS Performance. All rights reserved {year}.
          </p>
        </div>
      </div>
    </footer>
  );
}
