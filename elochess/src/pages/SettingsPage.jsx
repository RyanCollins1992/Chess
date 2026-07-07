import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { THEMES, DEFAULT_THEME_ID } from '../styles/themes'
import { PIECE_STYLES, DEFAULT_PIECE_STYLE_ID } from '../styles/pieceStyles'
import { TEMPO_THEME } from '../styles/tempo'

export default function SettingsPage() {
  const { settings, updateSettings, showToast, refreshProgress } = useAppStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [elo, setElo] = useState(progressManager.currentElo)
  const visualMode = settings.visualMode || 'medieval'

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
        <h2 className="text-2xl font-extrabold text-white font-heading">Settings</h2>
        <p className="text-muted text-sm mt-1">Customise your EloChess experience</p>
      </div>

      {/* Profile */}
      <Section title="👤 Profile">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted block mb-1.5">Your ELO Rating</label>
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
            <label className="text-sm font-medium text-muted block mb-1.5">Chess.com Username</label>
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

      {/* Visual mode */}
      <Section title="✦ Visual Mode">
        <div className="flex gap-2">
          <button
            onClick={() => save('visualMode', 'medieval')}
            className={`flex-1 text-left p-2.5 rounded-lg border transition-colors ${
              visualMode === 'medieval' ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'
            }`}
          >
            <div className={`text-xs font-bold ${visualMode === 'medieval' ? 'text-gold' : 'text-white'}`}>Medieval</div>
            <div className="text-[11px] text-muted mt-0.5">The 8 themes below, plus switchable piece art.</div>
          </button>
          <button
            onClick={() => save('visualMode', 'tempo')}
            className={`flex-1 text-left p-2.5 rounded-lg border transition-colors ${
              visualMode === 'tempo' ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'
            }`}
          >
            <div className={`text-xs font-bold ${visualMode === 'tempo' ? 'text-gold' : 'text-white'}`}>Tempo</div>
            <div className="text-[11px] text-muted mt-0.5">{TEMPO_THEME.description}</div>
          </button>
        </div>
      </Section>

      {/* Theme — only meaningful in Medieval mode */}
      {visualMode !== 'tempo' && <Section title="🎨 Theme">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEMES.map(theme => {
            const active = (settings.theme || DEFAULT_THEME_ID) === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => save('theme', theme.id)}
                title={theme.description}
                className={`text-left p-2.5 rounded-lg border transition-colors ${
                  active ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'
                }`}
              >
                <div className="flex gap-1 mb-1.5">
                  {[theme.colors.bg, theme.colors.gold, theme.colors.accent, theme.colors.accent2].map((c, i) => (
                    <span key={i} className="w-3.5 h-3.5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className={`text-xs font-bold ${active ? 'text-gold' : 'text-white'}`}>{theme.name}</div>
              </button>
            )
          })}
        </div>
      </Section>}

      {/* Piece Style — only meaningful in Medieval mode; Tempo always uses
          its own typographic glyph set (see Chessboard.jsx). */}
      {visualMode !== 'tempo' && <Section title="♞ Piece Style">
        <div className="grid grid-cols-2 gap-2">
          {PIECE_STYLES.map(style => {
            const active = (settings.pieceStyle || DEFAULT_PIECE_STYLE_ID) === style.id
            return (
              <button
                key={style.id}
                onClick={() => save('pieceStyle', style.id)}
                title={style.description}
                className={`text-left p-2.5 rounded-lg border transition-colors ${
                  active ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'
                }`}
              >
                <div className={`text-xs font-bold ${active ? 'text-gold' : 'text-white'}`}>{style.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{style.description}</div>
              </button>
            )
          })}
        </div>
      </Section>}

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
            <label className="text-sm font-medium text-muted block mb-1.5">Daily review target</label>
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

      {/* Licenses & Credits */}
      <Section title="ℹ️ About & Licenses">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-white mb-1">Chess Engine</div>
            <p className="text-muted">
              Includes <span className="text-white">Stockfish 18</span> (unmodified,{' '}
              <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">source</a>),
              licensed under the{' '}
              <a href="https://www.gnu.org/licenses/gpl-3.0.txt" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">GNU GPL v3</a>.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Chess Pieces</div>
            <p className="text-muted">
              Piece artwork is the{' '}
              <a href="https://github.com/maurimo/chess-art" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">"Fantasy" set</a>{' '}
              by Maurizio Monge, licensed under the{' '}
              <a href="https://github.com/maurimo/chess-art/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">MIT License</a>.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Data Sources</div>
            <p className="text-muted">
              Game import uses the{' '}
              <a href="https://support.chess.com/en/articles/9650547-published-data-api" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Chess.com Published-Data API</a>{' '}
              and the{' '}
              <a href="https://lichess.org/api" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Lichess.org API</a>.
              EloChess is not affiliated with, endorsed by, or sponsored by Chess.com or Lichess.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">AI Coach</div>
            <p className="text-muted">
              Powered by{' '}
              <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Pollinations.ai</a>'s
              public text API (free tier). This is a third-party service and the feature may change if Pollinations updates their API access requirements.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Open Source Libraries</div>
            <p className="text-muted">
              React, Vite, Tailwind CSS, chess.js, react-chessboard, Zustand, and Capacitor (all MIT licensed).
            </p>
          </div>
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
