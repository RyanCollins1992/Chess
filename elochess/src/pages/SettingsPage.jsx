import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'

export default function SettingsPage() {
  const { settings, updateSettings, showToast, refreshProgress } = useAppStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [elo, setElo] = useState(progressManager.currentElo)

  const save = (key, value) => {
    updateSettings({ [key]: value })
    showToast('Settings saved', 'success', 1500)
  }

  const handleEloSave = () => {
    const n = parseInt(elo)
    if (isNaN(n) || n < 100 || n > 3000) { showToast('Enter a valid ELO (100–3000)', 'error'); return }
    progressManager.recordElo(n)
    refreshProgress()
    showToast('ELO updated!', 'success')
  }

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.clear()
    showToast('All data cleared — refreshing…', 'info')
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Settings</h2>
        <p className="text-muted text-sm mt-1">Customise your EloChess experience</p>
      </div>

      {/* Profile */}
      <Section title="👤 Profile">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#9CA3AF] block mb-1.5">Your ELO Rating</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={elo}
                onChange={e => setElo(e.target.value)}
                className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/50"
                placeholder="e.g. 850"
                min={100} max={3000}
              />
              <button onClick={handleEloSave} className="btn-gold text-sm px-4">Save</button>
            </div>
            <p className="text-xs text-muted mt-1">Used to calibrate difficulty and track improvement</p>
          </div>
          <div>
            <label className="text-sm font-medium text-[#9CA3AF] block mb-1.5">Chess.com Username</label>
            <input
              type="text"
              defaultValue={settings.chesscomUsername || ''}
              onBlur={e => save('chesscomUsername', e.target.value)}
              placeholder="your username"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/50"
            />
          </div>
        </div>
      </Section>

      {/* Board */}
      <Section title="♟ Board">
        <div className="space-y-3">
          <ToggleRow
            label="Show coordinates"
            desc="Display a–h and 1–8 labels on the board"
            value={settings.showCoords !== false}
            onChange={v => save('showCoords', v)}
          />
          <ToggleRow
            label="Animate moves"
            desc="Smooth piece movement animations"
            value={settings.animateMoves !== false}
            onChange={v => save('animateMoves', v)}
          />
          <ToggleRow
            label="Sound effects"
            desc="Play sounds on moves and captures"
            value={settings.sounds !== false}
            onChange={v => save('sounds', v)}
          />
          <div>
            <label className="text-sm font-medium text-[#9CA3AF] block mb-1.5">Board theme</label>
            <div className="flex gap-2">
              {['classic', 'walnut', 'slate', 'ocean'].map(theme => (
                <button
                  key={theme}
                  onClick={() => save('boardTheme', theme)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    (settings.boardTheme || 'classic') === theme
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-border text-muted hover:text-white'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Study */}
      <Section title="📖 Study">
        <div className="space-y-3">
          <ToggleRow
            label="Auto-advance opponent moves"
            desc="Opponent moves play automatically in drill mode"
            value={settings.autoAdvance !== false}
            onChange={v => save('autoAdvance', v)}
          />
          <ToggleRow
            label="Show move hints"
            desc="Highlight legal squares when picking up a piece"
            value={settings.showHints !== false}
            onChange={v => save('showHints', v)}
          />
          <div>
            <label className="text-sm font-medium text-[#9CA3AF] block mb-1.5">Daily review target</label>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => save('dailyTarget', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    (settings.dailyTarget || 20) === n
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-border text-muted hover:text-white'
                  }`}
                >
                  {n}/day
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Stats */}
      <Section title="📊 Your Stats">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatRow label="Total XP" value={progressManager.xpTotal} />
          <StatRow label="Current Level" value={progressManager.level} />
          <StatRow label="Day Streak" value={`${progressManager.streak} days`} />
          <StatRow label="SRS Cards" value={srsEngine.getStats().total} />
          <StatRow label="Cards Mastered" value={srsEngine.getStats().mastered} />
          <StatRow label="Total Drills" value={progressManager.totalDrills} />
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="⚠️ Data" danger>
        <div className="space-y-3">
          <p className="text-sm text-muted">This will permanently delete all your progress, XP, badges, and SRS data.</p>
          <button
            onClick={handleReset}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              confirmReset
                ? 'bg-danger text-white border-danger'
                : 'bg-bg3 text-danger border-danger/40 hover:border-danger'
            }`}
          >
            {confirmReset ? '⚠️ Click again to confirm reset' : 'Reset All Progress'}
          </button>
          {confirmReset && (
            <button onClick={() => setConfirmReset(false)} className="text-xs text-muted hover:text-white ml-3">
              Cancel
            </button>
          )}
        </div>
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────
function Section({ title, children, danger }) {
  return (
    <div className={`card space-y-4 ${danger ? 'border-danger/30' : ''}`}>
      <div className={`font-bold text-sm uppercase tracking-wide ${danger ? 'text-danger' : 'text-muted'}`}>
        {title}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-gold' : 'bg-bg3 border border-border'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-bg3 rounded-lg px-3 py-2 border border-border">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  )
}
