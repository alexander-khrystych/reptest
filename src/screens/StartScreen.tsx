import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { TRIADS, GRID_SIZE } from '@/data'

// --- TEMPORARY testing shortcut (remove later): jump to a filled result grid with randomly
//     generated English demo content. Classes and roles are untouched (they come from the
//     locale data); only the user-entered characters + constructs and the ✓ pattern are random. ---

// Character-name pool (varied lengths — short first names, long compound names, and initials).
const NAME_POOL = [
  'Sam', 'Max', 'Ben', 'Eve', 'Joe', 'Amy', 'Zoe', 'Mia', 'Tom', 'Ray', 'Ivy', 'Leo', 'Ada', 'Kai',
  'Sarah', 'David', 'Emily', 'Chloe', 'Jacob', 'Laura', 'Peter', 'Oscar', 'Simon', 'Clara', 'Grace',
  'Henry', 'Molly', 'Diana', 'Frank', 'Nadia', 'Colin', 'Ruby', 'Ethan', 'Naomi', 'Isaac', 'Bella',
  'Victoria', 'Nathaniel', 'Josephine', 'Sebastian', 'Alexandra', 'Christopher', 'Evangeline',
  'Bernadette', 'Mary-Katherine', 'Jean-Baptiste', 'Anna-Christina', 'Charlie-Louise', 'A. V.',
]

// Bipolar construct pool (emergent, contrast). A couple of pairs are deliberately long so the
// X / Y pole columns still exercise their widest state.
const CONSTRUCT_POOL: [string, string][] = [
  ['flexible', 'rigid'],
  ['ambitious', 'unambitious'],
  ['decisive', 'indecisive'],
  ['well-educated', 'poorly educated'],
  ['modest', 'boastful'],
  ['curious', 'incurious'],
  ['gentle', 'harsh'],
  ['cheerful', 'gloomy'],
  ['self-confident', 'insecure'],
  ['disciplined', 'undisciplined'],
  ['athletic', 'unathletic'],
  ['kind', 'cruel'],
  ['focused', 'easily distracted'],
  ['calm', 'anxious'],
  ['brave', 'cowardly'],
  ['a natural leader', 'a follower'],
  ['altruistic', 'self-centred'],
  ['determined', 'aimless'],
  ['honest', 'dishonest'],
  ['extraverted', 'introverted'],
  ['generous', 'stingy'],
  ['patient', 'impatient'],
  ['optimistic', 'pessimistic'],
  ['organized', 'disorganized'],
  ['reliable', 'unreliable'],
  ['creative', 'conventional'],
  ['warm', 'cold'],
  ['assertive', 'passive'],
  ['humble', 'arrogant'],
  ['punctual', 'always late'],
  ['open-minded', 'closed-minded'],
  ['emotionally stable', 'volatile'],
  ['hard-working', 'lazy'],
  ['adventurous', 'cautious'],
  ['strong organizational skills', 'no organizational skills'],
  ['speaks several foreign languages', 'speaks only their own'],
]

// The original demo's widest inputs — the random data must be at least this wide so the layout
// keeps stress-testing the tallest name column and the widest X / Y pole columns.
const MIN_NAME_LEN = 13 // 'Нарциславовна'
const MIN_EMERGENT_LEN = 27 // 'организационные способности'
const MIN_CONTRAST_LEN = 21 // 'Не владеет ин. языком'

const LONG_NAMES = NAME_POOL.filter((n) => n.length >= MIN_NAME_LEN)
const LONG_CONSTRUCTS = CONSTRUCT_POOL.filter(
  ([em, co]) => em.length >= MIN_EMERGENT_LEN && co.length >= MIN_CONTRAST_LEN,
)

const randInt = (n: number) => Math.floor(Math.random() * n)
const shuffle = <T,>(a: readonly T[]): T[] => {
  const arr = a.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function loadDemoResult() {
  // 22 unique random names; guarantee the tallest is at least as long as the original's longest.
  const names = shuffle(NAME_POOL).slice(0, GRID_SIZE)
  if (Math.max(...names.map((n) => n.length)) < MIN_NAME_LEN) {
    names[randInt(GRID_SIZE)] = LONG_NAMES[randInt(LONG_NAMES.length)]
  }
  // 22 unique random constructs; guarantee one pair is as wide as the original in both poles.
  const poles = shuffle(CONSTRUCT_POOL).slice(0, GRID_SIZE)
  const wideEnough = poles.some(
    ([em, co]) => em.length >= MIN_EMERGENT_LEN && co.length >= MIN_CONTRAST_LEN,
  )
  if (!wideEnough) {
    poles[randInt(GRID_SIZE)] = LONG_CONSTRUCTS[randInt(LONG_CONSTRUCTS.length)]
  }

  const constructs = TRIADS.map((tri, k) => {
    const triad = tri.map((p) => p - 1)
    const others = Array.from({ length: GRID_SIZE }, (_, i) => i).filter((i) => !triad.includes(i))
    return {
      oddPos: triad[randInt(3)], // random odd-one-out among the triad
      emergent: poles[k][0],
      contrast: poles[k][1],
      selected: shuffle(others).slice(0, randInt(others.length + 1)), // random ✓ subset
    }
  })

  useAppStore.setState({
    phase: 'result',
    names,
    drafts: Array.from({ length: GRID_SIZE }, () => ''),
    nameIndex: 0,
    constructs,
    triadIndex: 0,
    // start the demo from a clean analysis slate
    savedTables: [],
    pairsByTable: {},
    activePairByTable: {},
  })
}
// --- end temporary shortcut ---

/** Start screen — two actions only, per spec (no intro copy in MVP). */
export function StartScreen() {
  const { t } = useTranslation()
  const startTest = useAppStore((s) => s.startTest)

  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center gap-3.5">
      <p className="mb-2 text-ink-3">{t('start.tagline')}</p>

      <button
        type="button"
        className="min-w-[280px] rounded-[9px] bg-primary px-5 py-3.5 text-[15px] font-medium text-white hover:bg-primary-2"
        onClick={startTest}
      >
        {t('start.start')}
      </button>

      <button
        type="button"
        className="min-w-[280px] rounded-[9px] border border-line bg-transparent px-5 py-3.5 text-[15px] text-ink hover:border-ink-3"
      >
        {t('start.resume')}
      </button>

      {/* TEMPORARY: preview the result grid without running the whole test. */}
      <button
        type="button"
        onClick={loadDemoResult}
        className="mt-6 rounded-[9px] border border-dashed border-ink-3 px-4 py-2 text-xs text-ink-3 hover:text-ink"
      >
        🧪 Demo result grid (testing)
      </button>
    </div>
  )
}
