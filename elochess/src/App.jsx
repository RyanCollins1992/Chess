import AppLayout from './components/layout/AppLayout'
import { useAppStore } from './store/useAppStore'
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

const PAGES = {
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
  'game-review':     <GameReviewPage />,
}

export default function App() {
  const currentPage = useAppStore(s => s.currentPage)
  return (
    <AppLayout>
      {PAGES[currentPage] || <div className="flex items-center justify-center h-full text-muted">Page not found</div>}
    </AppLayout>
  )
}
