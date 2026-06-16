import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AICoachPanel from '../ui/AICoachPanel'
import Toast from '../ui/Toast'
import { useAppStore } from '../../store/useAppStore'

export default function AppLayout({ children }) {
  const [coachOpen, setCoachOpen] = useState(false)
  const toast = useAppStore(s => s.toast)

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onCoachClick={() => setCoachOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Coach Panel */}
      <AICoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} onOpen={() => setCoachOpen(true)} />

      {/* Toast notifications */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
