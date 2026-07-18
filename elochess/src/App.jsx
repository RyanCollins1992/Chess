import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AppLayout from './components/layout/AppLayout'
import { useAppStore } from './store/useAppStore'
import { pageTransition, pageTransitionReduced } from './styles/motion'
import DashboardPage      from './pages/DashboardPage'
import OpeningsPage       from './pages/OpeningsPage'
import SpacedReviewPage   from './pages/SpacedReviewPage'
import ProgressPage       from './pages/ProgressPage'
import PuzzlesPage        from './pages/PuzzlesPage'
import EndgamesPage       from './pages/EndgamesPage'
import MatePatternsPage   from './pages/MatePatternsPage'
import SettingsPage       from './pages/SettingsPage'
import VsCoachPage        from './pages/VsCoachPage'
import FreePlayPage       from './pages/FreePlayPage'
import MemoryDrillPage    from './pages/MemoryDrillPage'
import OpeningQuizPage    from './pages/OpeningQuizPage'
import RateDifficultyPage from './pages/RateDifficultyPage'
import FavouritesPage     from './pages/FavouritesPage'
import PieceValuesPage    from './pages/PieceValuesPage'
import EloRoadmapPage     from './pages/EloRoadmapPage'
import ImportGamesPage    from './pages/ImportGamesPage'
import GameReviewPage     from './pages/GameReviewPage'
import LearnOpeningsPage  from './pages/LearnOpeningsPage'
import ScoutOpponentPage  from './pages/ScoutOpponentPage'
import OpeningDatabasePage from './pages/OpeningDatabasePage'

const PAGES = {
  'dashboard':       <DashboardPage />,
  'openings':        <OpeningsPage />,
  'spaced-review':   <SpacedReviewPage />,
  'progress':        <ProgressPage />,
  'puzzles':         <PuzzlesPage />,
  'endgames':        <EndgamesPage />,
  'mate-patterns':   <MatePatternsPage />,
  'settings':        <SettingsPage />,
  'vs-coach':        <VsCoachPage />,
  'free-play':       <FreePlayPage />,
  'memory-drill':    <MemoryDrillPage />,
  'opening-quiz':    <OpeningQuizPage />,
  'rate-difficulty': <RateDifficultyPage />,
  'favourites':      <FavouritesPage />,
  'piece-values':    <PieceValuesPage />,
  'elo-roadmap':     <EloRoadmapPage />,
  'import-games':    <ImportGamesPage />,
  'scout-opponent':  <ScoutOpponentPage />,
  'game-review':     <GameReviewPage />,
  'learn-openings':  <LearnOpeningsPage />,
  'opening-database': <OpeningDatabasePage />,
}

export default function App() {
  const currentPage = useAppStore(s => s.currentPage)
  const reduceMotion = useReducedMotion()
  const page = PAGES[currentPage] || <div className="flex items-center justify-center h-full text-muted">Page not found</div>

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          className="h-full"
          variants={reduceMotion ? pageTransitionReduced : pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {page}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}
