import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressPage from './ProgressPage'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

describe('ProgressPage', () => {
  beforeEach(() => {
    useAppStore.getState().refreshProgress()
  })

  it('shows the current level and XP total', () => {
    render(<ProgressPage />)
    expect(screen.getByText(`Level ${progressManager.level}`)).toBeInTheDocument()
    expect(screen.getByText(`${progressManager.xpTotal} XP total`)).toBeInTheDocument()
  })

  it('shows trap mastery as "known / total"', () => {
    render(<ProgressPage />)
    const { knownCount } = useAppStore.getState().progress
    expect(screen.getByText(`${knownCount} / 25 known`)).toBeInTheDocument()
  })

  it('renders all 12 badges, unearned ones dimmed', () => {
    render(<ProgressPage />)
    const badge = screen.getByText('First Drill').closest('div')
    expect(badge.className).toContain('opacity-40')
    expect(screen.getByText('All Black Traps')).toBeInTheDocument()
  })

  it('an earned badge loses the dimmed/grayscale styling', () => {
    progressManager.awardBadge('first_drill')
    useAppStore.getState().refreshProgress()
    render(<ProgressPage />)

    const badge = screen.getByText('First Drill').closest('div')
    expect(badge.className).not.toContain('grayscale')
    expect(badge.className).toContain('border-gold/40')
  })

  it('shows the full XP-earning reference list', () => {
    render(<ProgressPage />)
    expect(screen.getByText('Complete a trap drill')).toBeInTheDocument()
    expect(screen.getByText('+50 XP')).toBeInTheDocument() // Master a trap
  })

  it('does not repeat Dashboard-only stats like a rating chart', () => {
    render(<ProgressPage />)
    expect(screen.queryByText('Rating Progress')).not.toBeInTheDocument()
    expect(screen.queryByText('Current Rating')).not.toBeInTheDocument()
  })
})
