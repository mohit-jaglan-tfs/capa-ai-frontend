import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { AppLink } from "./AppLink"
import { isMockData } from "@/shared/config/env"

export function AppShell({ children }: { children: ReactNode }) {
  const currentPath = window.location.pathname
  const modules = [
    { label: "Home", href: "/", active: currentPath === "/" },
    { label: "MAP", href: "/map", active: currentPath.startsWith("/map") },
    {
      label: "MATCH",
      href: "/match",
      active: currentPath.startsWith("/match"),
    },
    { label: "AUTHOR", href: "/author", active: currentPath.startsWith("/author") },
  ]

  return (
    <div className="min-h-screen bg-suite-surface text-suite-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-brand"
      >
        Skip to content
      </a>
      <header className="flex h-[72px] items-center gap-3.5 bg-[#171a1f] px-4 py-3 sm:px-6">
        <AppLink
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-3.5"
          ariaLabel="CAPA.AI home"
        >
          <img
            src="/assets/logo-mark.svg"
            alt=""
            className="size-8 shrink-0 sm:size-[42px]"
          />
          <span className="text-[22px] font-bold whitespace-nowrap text-brand sm:text-[28px]">
            CAPA.AI
          </span>
          <span className="hidden text-xs whitespace-nowrap text-[#b8bfcc] sm:inline">
            QUALITY &amp; INSIGHTS AI SUITE
          </span>
        </AppLink>
        <div className="flex-1" />
        <div
          className="flex h-11 w-[104px] shrink-0 flex-col items-center justify-center bg-brand px-2 py-1.5 text-center text-xs leading-tight font-bold text-white sm:w-[118px]"
          aria-label="Thermo Fisher Scientific"
        >
          <span>Thermo Fisher</span>
          <span>SCIENTIFIC</span>
        </div>
      </header>
      {isMockData && (
        <div className="flex min-h-[34px] items-center justify-center bg-[#fce5e5] px-3 py-2 text-center text-[11px] font-bold text-brand sm:text-[13px]">
          SAMPLE DATA • NOT FOR GxP USE • NO QMS WRITE-BACK
        </div>
      )}
      <nav
        aria-label="CAPA.AI modules"
        className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-suite-line bg-white px-4 sm:px-6"
      >
        {modules.map((module) => (
          <AppLink
            key={module.href}
            href={module.href}
            ariaCurrent={module.active ? "page" : undefined}
            className={cx(
              "shrink-0 rounded-md px-3 py-2 text-xs font-bold",
              module.active
                ? "bg-brand-wash text-brand"
                : "text-suite-slate hover:bg-suite-hover",
            )}
          >
            {module.label}
          </AppLink>
        ))}
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className={cx("mx-auto flex w-full flex-col gap-4 p-4 outline-none sm:p-6", currentPath.startsWith("/author") ? "max-w-none" : "max-w-[1500px]")}
      >
        {children}
      </main>
    </div>
  )
}
