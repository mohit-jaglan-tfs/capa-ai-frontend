import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { canNavigate } from "@/shared/lib/navigation"
import { LandingScreen } from "@/features/landing/LandingScreen"
import { MapRoutes } from "@/features/map/MapRoutes"
import { MatchScreen } from "@/features/match/MatchScreen"
import { AppShell, NotFoundScreen } from "@/shared/components"
import { parseRoute, type Route } from "./routes"

const AuthorApp = lazy(() => import("@/features/author/App"))

function renderRoute(route: Route) {
  switch (route.type) {
    case "landing":
      return <LandingScreen />
    case "match":
      return <MatchScreen />
    case "author":
      return <Suspense fallback={<p>Loading AUTHOR…</p>}><AuthorApp /></Suspense>
    case "overview":
    case "cluster":
    case "evidence":
    case "record":
      return <MapRoutes route={route} />
    default:
      return <NotFoundScreen message="The page you requested does not exist." />
  }
}

export default function App() {
  const previousPath = useRef(window.location.pathname + window.location.search)
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname),
  )

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const path = window.location.pathname + window.location.search
      if (!event.state?.capaGuardChecked && !canNavigate(path)) {
        window.history.pushState({}, "", previousPath.current)
        return
      }
      previousPath.current = path
      setRoute(parseRoute(window.location.pathname))
      window.scrollTo({ top: 0, behavior: "auto" })
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h1")
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [route])

  return <AppShell>{renderRoute(route)}</AppShell>
}
