import { AppLink } from "@/shared/components"

interface WorkspaceCard {
  module: string
  status: string
  title: string
  description: string
  supports: string
  action: string
  href?: string
  placeholder?: boolean
}

const workspaceCards: WorkspaceCard[] = [
  {
    module: "MAP",
    status: "PILOT",
    title: "Pattern analysis",
    description:
      "Surface recurring deviation patterns across selected sites, products, and time periods. Explore clusters and inspect the records behind them.",
    supports: "Population trends • cluster review • source evidence",
    action: "Open MAP",
    href: "/map",
  },
  {
    module: "MATCH",
    status: "PILOT",
    title: "Find related history",
    description:
      "Compare a deviation with historical cases that share relevant event characteristics, so investigators can review potentially useful precedent.",
    supports: "Human review determines relevance and applicability.",
    action: "Open MATCH",
    href: "/match",
  },
  {
    module: "ASK",
    status: "IN DEVELOPMENT",
    title: "Ask quality content",
    description:
      "Ask questions of AI-connected quality content to get answers informed by processes, procedures, and documentation.",
    supports: "Document-grounded questions • source-linked answers",
    action: "Query data • not available",
    placeholder: true,
  },
  {
    module: "AUTHOR",
    status: "IN DEVELOPMENT",
    title: "Draft with evidence",
    description:
      "Support investigation, root cause, and resolution planning with evidence-linked drafting that keeps facts, inferences, and unknowns visible.",
    supports: "TrackWise remains the system of record; no write-back.",
    action: "Open AUTHOR",
    href: "/author",
  },
  {
    module: "TREND",
    status: "PLANNED",
    title: "Monitor quality trends",
    description:
      "Track quality trends and emerging risks over time across future connected quality data.",
    supports: "Emerging signals • longitudinal quality views",
    action: "View trends • not available",
    placeholder: true,
  },
  {
    module: "NOVA",
    status: "COMING IN 2026",
    title: "Navigate the AI suite",
    description:
      "A future AI guide across the connected Quality & Insights AI suite.",
    supports: "Cross-workspace guidance • suite navigation",
    action: "Ask Nova • not available",
    placeholder: true,
  },
]

export function LandingScreen() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-[22px] py-2">
      <section className="flex min-h-[210px] flex-col gap-6 overflow-hidden rounded-[14px] bg-suite-ink-deep p-7 lg:flex-row lg:items-center lg:gap-[26px]">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3 lg:min-h-[170px] lg:justify-center">
          <p className="text-[11px] font-bold text-[#ff6b6e]">
            QUALITY &amp; INSIGHTS AI SUITE
          </p>
          <h1 className="max-w-[760px] text-[28px] leading-[1.22] font-bold text-white sm:text-[32px]">
            From deviation data to stronger investigations.
          </h1>
          <p className="max-w-[760px] text-[14px] leading-normal text-[#c7cfdb]">
            A connected set of AI-assisted tools to surface recurring patterns,
            find relevant history, and support evidence-linked investigation
            drafting.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-4 rounded-[10px] bg-[#262930] p-5 lg:h-[145px] lg:w-[450px]">
          <p className="text-[14px] font-bold text-white">Suite workflow</p>
          <div className="grid grid-cols-3 gap-2.5">
            {["MAP", "MATCH", "AUTHOR"].map((stage, index) => (
              <div
                key={stage}
                className="flex h-14 min-w-0 flex-col items-center gap-1 overflow-hidden text-center"
              >
                <div className="h-6 w-6 shrink-0">
                  <img src="/assets/stage-marker.svg" alt="" />
                </div>
                <p className="h-[13px] text-[10px] leading-normal font-bold text-white">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="w-full truncate text-[11px] font-bold text-[#dbe0e8]">
                  {stage}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[20px] leading-[25px] font-bold text-suite-ink-deep">
          Choose a workspace
        </h2>
        <p className="mt-1 text-[12px] leading-4 text-suite-muted">
          Explore available workspaces and preview planned modules across the
          quality workflow.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {workspaceCards.map((card) => {
          const content = (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-[25px] w-[68px] shrink-0 items-center rounded-md bg-[#ffedee] px-[9px] text-[11px] font-bold text-[#e81316]">
                  {card.module}
                </span>
                <span
                  className={
                    card.placeholder
                      ? "ml-auto rounded-md bg-[#edf0f4] px-2 py-1 text-[9px] font-bold text-suite-muted"
                      : "truncate text-[10px] font-bold text-suite-muted"
                  }
                >
                  {card.status}
                </span>
              </div>
              <h3 className="text-[23px] leading-[30px] font-bold text-suite-ink-deep">
                {card.title}
              </h3>
              <p className="min-h-[54px] text-[13px] leading-normal text-suite-muted">
                {card.description}
              </p>
              <div className="min-h-[54px] rounded-lg bg-[#f6f8fb] p-2.5">
                <p className="text-[9px] leading-3 font-bold text-suite-muted">
                  SUPPORTS
                </p>
                <p className="mt-[5px] text-[11px] leading-[17px] text-suite-ink-deep">
                  {card.supports}
                </p>
              </div>
              <div
                className={`mt-auto flex h-5 items-center text-[12px] font-bold ${
                  card.href ? "text-[#e81316]" : "text-suite-muted"
                }`}
              >
                <span className="min-w-0 flex-1">{card.action}</span>
                {card.href && (
                  <span
                    className="w-5 text-center text-[16px]"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </div>
            </>
          )
          const className =
            "flex min-h-[306px] min-w-0 flex-col gap-3 rounded-xl border border-suite-line bg-white p-[22px] text-left"
          const cardClassName = card.placeholder
            ? `${className} border-suite-line-strong bg-[#f7f8fa] opacity-55 grayscale`
            : className

          return card.href ? (
            <AppLink
              key={card.module}
              href={card.href}
              className={`${cardClassName} cursor-pointer transition-shadow hover:shadow-md`}
              ariaLabel={`Open ${card.module}`}
            >
              {content}
            </AppLink>
          ) : (
            <article key={card.module} className={cardClassName}>
              {content}
            </article>
          )
        })}
      </section>

      <section className="flex min-h-[82px] flex-col gap-4 rounded-[10px] border border-suite-line bg-white p-[18px] sm:flex-row sm:items-center sm:gap-6">
        <div className="shrink-0 sm:w-[330px]">
          <h2 className="text-[13px] leading-[18px] font-bold text-suite-ink-deep">
            Human review stays in control
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-suite-muted">
            Decision support, not a quality decision.
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-[13px] font-bold text-[#e81316]">
            SYSTEM BOUNDARY
          </p>
          <p className="mt-[5px] text-[11px] leading-[18px] text-suite-muted">
            Outputs require qualified review. TrackWise remains the system of
            record; CAPA.AI does not write back to it.
          </p>
        </div>
      </section>
    </div>
  )
}
