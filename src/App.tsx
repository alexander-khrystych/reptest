import { useEffect, type ComponentType } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { IS_OBSERVER } from '@/session/config'
import { NavBar } from '@/components/NavBar'
import { ResetControl } from '@/components/ResetControl'
import { SessionOverlays } from '@/components/SessionOverlays'
import { StartScreen } from '@/screens/StartScreen'
import { NamesScreen } from '@/screens/NamesScreen'
import { ElicitationScreen } from '@/screens/ElicitationScreen'
import { ResultScreen } from '@/screens/ResultScreen'
import { Grid10CharsScreen } from '@/screens/Grid10CharsScreen'
import { Grid10GroupScreen } from '@/screens/Grid10GroupScreen'
import { Grid10RankScreen } from '@/screens/Grid10RankScreen'
import { ObserverScreen } from '@/screens/ObserverScreen'
import type { Phase } from '@/store/useAppStore'

const SCREENS: Record<Phase, ComponentType> = {
  start: StartScreen,
  names: NamesScreen,
  elicitation: ElicitationScreen,
  result: ResultScreen,
  g10chars: Grid10CharsScreen,
  g10group: Grid10GroupScreen,
  g10rank: Grid10RankScreen,
}

/** The testee's app — the four-phase wizard plus the sharing overlays. */
function TesteeApp() {
  const phase = useAppStore((s) => s.phase)
  const demo = useAppStore((s) => s.demo)
  // A persisted phase that no longer maps to a screen (e.g. a stale one from an older build) must
  // never hard-crash the app. Route it to the result screen — where the only removable phases (the
  // 10×10 flow) are launched from — and heal the stored phase so it doesn't recur.
  const safePhase: Phase = phase in SCREENS ? phase : 'result'
  useEffect(() => {
    if (safePhase !== phase) useAppStore.setState({ phase: safePhase })
  }, [safePhase, phase])
  const Screen = SCREENS[safePhase]
  // The result grid wants the full screen width; the other screens stay narrow.
  const wide = phase === 'result'
  const inFlow = phase === 'g10chars' || phase === 'g10group' || phase === 'g10rank'

  return (
    <div className="min-h-full">
      {/* The header is a pinned, full-width bar (it constrains its own content width). */}
      <NavBar />
      <div className={`mx-auto pb-16 pt-6 ${wide ? 'max-w-[1600px] px-4' : 'max-w-[1080px] px-6'}`}>
        {/* key={phase} re-triggers the fade so each stage flows into the next. */}
        <div key={phase} className="animate-fade">
          <Screen />
        </div>
        {/* Demo results use a Back button (in the header) instead of Start over; the 10×10 flow
            has its own Back/Cancel, so no floating Start-over there either. */}
        {phase !== 'start' && !demo && !inFlow && <ResetControl />}
      </div>
      <SessionOverlays />
    </div>
  )
}

/** A `/w/<roomId>` URL boots the read-only observer app; every other URL is the testee's. */
export default function App() {
  return IS_OBSERVER ? <ObserverScreen /> : <TesteeApp />
}
