import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AICoach } from './AICoach'

describe('AICoach', () => {
  let coach

  beforeEach(() => {
    coach = new AICoach()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('send — happy path', () => {
    it('returns the assistant reply from a successful fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Develop your knights first.' } }] }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const reply = await coach.send('What should I play first?')
      expect(reply).toBe('Develop your knights first.')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('pushes both user and assistant messages into history', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Reply text' } }] }),
      }))

      await coach.send('Hello')
      expect(coach.history).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Reply text' },
      ])
    })

    it('falls back to a default message if the response has no choices content', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      }))

      const reply = await coach.send('Hello')
      expect(reply).toBe('Sorry, I could not generate a response.')
    })
  })

  describe('send — failure path falls back to _getFallbackReply', () => {
    it('fetch rejecting falls back to the local fallback reply', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      const reply = await coach.send('Hello')
      expect(reply).toContain("I’m unable to connect right now")
      expect(coach.history.at(-1)).toEqual({ role: 'assistant', content: reply })
    })

    it('fetch returning non-200 falls back to the local fallback reply', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

      const reply = await coach.send('Hello')
      expect(reply).toContain("I’m unable to connect right now")
    })

    it('passes an abort signal to fetch so a hung request times out', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await coach.send('Hello')
      const options = mockFetch.mock.calls[0][1]
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })

    it('a timed-out fetch falls back, resets isThinking, and allows a subsequent send', async () => {
      // AbortSignal.timeout(15000) rejects the fetch with a TimeoutError
      // DOMException — simulate that rejection directly.
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      ))

      const reply = await coach.send('Hello')
      expect(reply).toContain("I’m unable to connect right now")
      expect(coach.isThinking).toBe(false)

      // The coach must recover: a later call should reach fetch again
      // instead of throwing "Already thinking".
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'recovered' } }] }),
      }))
      await expect(coach.send('Are you back?')).resolves.toBe('recovered')
    })

    it('fallback reply includes context-specific tips when context is set', async () => {
      coach.setContext({ elo: 1000, trapName: 'Fried Liver Attack', currentMoves: 'e4 e5' })
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))

      const reply = await coach.send('Help')
      expect(reply).toContain('Fried Liver Attack')
      expect(reply).toContain('hanging pieces')
    })
  })

  describe('guards', () => {
    it('calling send() again while already thinking throws', async () => {
      let resolveFetch
      vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { resolveFetch = resolve })))

      const firstCall = coach.send('first message')
      expect(coach.isThinking).toBe(true)

      await expect(coach.send('second message')).rejects.toThrow('Already thinking')

      resolveFetch({ ok: true, json: async () => ({ choices: [{ message: { content: 'done' } }] }) })
      await firstCall
    })

    it('empty message short-circuits without calling fetch', async () => {
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)

      const result = await coach.send('')
      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('whitespace-only message short-circuits without calling fetch', async () => {
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)

      const result = await coach.send('   \n\t  ')
      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('isThinking is reset to false after send resolves', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      }))
      await coach.send('Hello')
      expect(coach.isThinking).toBe(false)
    })

    it('isThinking is reset to false even after a failed fetch', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
      await coach.send('Hello')
      expect(coach.isThinking).toBe(false)
    })
  })

  describe('history truncation', () => {
    it('only the last MAX_HISTORY messages are sent to the API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ack' } }] }),
      })
      vi.stubGlobal('fetch', mockFetch)

      // Each send() adds 2 messages to history (user + assistant). Send enough times
      // to comfortably exceed MAX_HISTORY.
      const sends = AICoach.MAX_HISTORY + 5
      for (let i = 0; i < sends; i++) {
        await coach.send(`message ${i}`)
      }

      expect(coach.history.length).toBe(sends * 2)

      const lastCallBody = JSON.parse(mockFetch.mock.calls.at(-1)[1].body)
      // messages = [system prompt, ...history.slice(-MAX_HISTORY)]
      expect(lastCallBody.messages.length).toBe(AICoach.MAX_HISTORY + 1)
      expect(lastCallBody.messages[0].role).toBe('system')
    })
  })

  describe('clearHistory', () => {
    it('empties history and emits "cleared"', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ack' } }] }),
      }))
      await coach.send('Hello')
      expect(coach.history.length).toBeGreaterThan(0)

      const cb = vi.fn()
      coach.on('cleared', cb)
      coach.clearHistory()
      expect(coach.history).toEqual([])
      expect(cb).toHaveBeenCalled()
    })
  })
})
