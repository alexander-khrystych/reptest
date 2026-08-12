import type { ComponentType } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { NavBar } from '@/components/NavBar'
import { ResetControl } from '@/components/ResetControl'
import { StartScreen } from '@/screens/StartScreen'
import { NamesScreen } from '@/screens/NamesScreen'
import { ElicitationScreen } from '@/screens/ElicitationScreen'
import { ResultScreen } from '@/screens/ResultScreen'
import type { Phase } from '@/store/useAppStore'

const SCREENS: Record<Phase, ComponentType> = {
  start: StartScreen,
  names: NamesScreen,
  elicitation: ElicitationScreen,
  result: ResultScreen,
}

export default function App() {
  const phase = useAppStore((s) => s.phase)
  const Screen = SCREENS[phase]
  // The result grid wants the full screen width; the other screens stay narrow.
  const wide = phase === 'result'

  return (
    <div className="min-h-full">
      <div className={`mx-auto pb-16 ${wide ? 'max-w-[1600px] px-4' : 'max-w-[1080px] px-6'}`}>
        <NavBar />
        {/* key={phase} re-triggers the fade so each stage flows into the next. */}
        <div key={phase} className="animate-fade">
          <Screen />
        </div>
        {phase !== 'start' && <ResetControl />}
      </div>
    </div>
  )
}
