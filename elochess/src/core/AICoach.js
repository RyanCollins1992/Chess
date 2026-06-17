import { BaseManager } from './BaseManager'

const CHESS_KNOWLEDGE = `
PIECE VALUES: Pawn=100cp, Knight=320cp, Bishop=330cp, Rook=500cp, Queen=900cp. Bishops > knights in open positions; knights > bishops in closed positions.

OPENING PRINCIPLES: Control the centre (e4/e5/d4/d5), develop knights before bishops, castle early, don't move the same piece twice, connect rooks.

MAIN OPENINGS:
- 1.e4: Italian (1.e4 e5 2.Nf3 Nc6 3.Bc4, positional), Ruy López (3.Bb5, strategic), Sicilian (1...c5, asymmetric), French (1...e6, solid), Caro-Kann (1...c6, structural), Scandinavian (1...d5)
- 1.d4: Queen's Gambit (1.d4 d5 2.c4, classical), King's Indian (1...Nf6 2.c4 g6, dynamic), Nimzo-Indian (3.Nc3 Bb4, pin-based), Grünfeld (hypermodern), Dutch (1...f5, aggressive), London System (solid)
- Flank: English (1.c4), Réti (1.Nf3)

TACTICS: Fork (one piece attacks two), Pin (piece can't move without exposing more valuable piece), Skewer (reverse pin), Discovered Attack (moving one piece reveals attack), Double Check (only king move escapes), Zwischenzug (unexpected intermediate move), Deflection (force defender away), Decoy (lure piece to bad square), Overloading (too many defensive duties), X-Ray (influence through another piece).

MATE PATTERNS: Back Rank (Rook/Queen on 1st/8th rank), Smothered (Knight, king smothered by own pieces), Scholar's (Qh5+Bc4 on f7), Epaulette (king between two rooks), Anastasia's (Knight+Rook), Arabian (Knight+Rook on h-file), Opera (Bishop+Rook), Boden's (two bishops criss-cross), Hook (Rook+Knight+Pawn).

ENDGAME PRINCIPLES: Activate the king, push passed pawns, rooks behind passed pawns, opposition (kings facing with one square between), zugzwang.
KEY ENDGAMES: K+Q vs K (win: drive to edge), K+R vs K (win: lawnmower), K+P vs K (key squares+opposition), K+2B vs K (win: corner), K+B vs K / K+N vs K (draw), Lucena (win: bridge), Philidor (draw: defensive).

ELO GUIDANCE:
- <800: Piece movement, basic checkmates, don't hang pieces
- 800-1200: Forks/pins, control centre, castle early
- 1200-1600: Opening principles, K+P/K+R endgames, calculation
- 1600-2000: Opening repertoire, positional play, advanced endgames
- 2000+: Deep opening prep, prophylaxis, complex endgames
`.trim()

export class AICoach extends BaseManager {
  static MAX_HISTORY = 20
  static MAX_TOKENS  = 500
  static API_URL     = 'https://text.pollinations.ai/openai'

  constructor() {
    super('elochess-ai-coach')
    this._history    = []
    this._isThinking = false
    this._context    = {}
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Update board/study context so the AI knows what the user is looking at */
  setContext({ elo, trapName, trapDescription, currentMoves } = {}) {
    this._context = { elo, trapName, trapDescription, currentMoves }
  }

  /** Send a message. Returns the assistant reply string. */
  async send(userMessage) {
    if (this._isThinking) throw new Error('Already thinking')
    if (!userMessage?.trim()) return null

    this._isThinking = true
    this.emit('thinking', true)

    const userMsg = { role: 'user', content: userMessage.trim() }
    this._history.push(userMsg)
    this.emit('message', { role: 'user', content: userMessage.trim() })

    try {
      const messages = [
        { role: 'system', content: this._buildSystemPrompt() },
        ...this._history.slice(-AICoach.MAX_HISTORY)
      ]

      const response = await fetch(AICoach.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'openai',
          messages,
          max_tokens: AICoach.MAX_TOKENS,
          private:    true,
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data  = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

      this._history.push({ role: 'assistant', content: reply })
      this.emit('message', { role: 'assistant', content: reply })
      return reply

    } catch (error) {
      const fallback = this._getFallbackReply()
      this._history.push({ role: 'assistant', content: fallback })
      this.emit('message', { role: 'assistant', content: fallback })
      return fallback
    } finally {
      this._isThinking = false
      this.emit('thinking', false)
    }
  }

  /** Clear conversation history */
  clearHistory() {
    this._history = []
    this.emit('cleared')
  }

  get isThinking() { return this._isThinking }
  get history()    { return [...this._history] }

  _getFallbackReply() {
    const { trapName, currentMoves } = this._context
    let reply = "I’m unable to connect right now. Quick tip: develop your pieces (knights before bishops), control the centre, and castle early to keep your king safe."
    if (trapName) reply += ` While studying ${trapName}, focus on the move order and the key idea behind the opening.`
    if (currentMoves) reply += ' Watch for hanging pieces and tactical patterns like forks, pins, and skewers.'
    return reply
  }

  // ── Private ──────────────────────────────────────────────────────

  _buildSystemPrompt() {
    const { elo = 'unknown', trapName, trapDescription, currentMoves } = this._context

    let prompt = `You are a friendly, expert chess coach inside the EloChess training app. The player's estimated ELO is ${elo}. `
    prompt += `You ONLY answer chess-related questions. If asked about anything unrelated to chess, politely decline and redirect to chess topics. `
    prompt += `Give clear, concise explanations in plain English. Use **bold** for key terms. Keep responses under 5 sentences unless the user asks for more detail. `
    prompt += `Tailor advice to the player's ELO level — beginners need simple tips, advanced players can handle deeper concepts. `
    prompt += `\n\nCHESS KNOWLEDGE BASE:\n${CHESS_KNOWLEDGE}\n`

    if (trapName) {
      prompt += `\nThe player is currently studying: "${trapName}". `
      if (trapDescription) prompt += `Opening context: ${trapDescription}. `
      if (currentMoves)    prompt += `Moves played so far: ${currentMoves}. `
    }

    return prompt
  }
}

// Singleton
export const aiCoach = new AICoach()
