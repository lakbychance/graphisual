import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStepThrough } from './useStepThrough'
import { AlgorithmStep, AlgorithmGenerator } from '../algorithms/types'

// Helper to create a simple generator
function* createTestGenerator(steps: AlgorithmStep[]): AlgorithmGenerator {
  for (const step of steps) {
    yield step
  }
}

describe('useStepThrough', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const testSteps: AlgorithmStep[] = [
    { type: 'visit', edge: { from: -1, to: 1 } },
    { type: 'visit', edge: { from: 1, to: 2 } },
    { type: 'visit', edge: { from: 1, to: 3 } },
    { type: 'visit', edge: { from: 2, to: 4 } },
  ]

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useStepThrough())
    const [state] = result.current

    expect(state.steps).toHaveLength(0)
    expect(state.currentIndex).toBe(-1)
    expect(state.isComplete).toBe(false)
    expect(state.mode).toBe('idle')
  })

  it('start() initializes with first step', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    const [state] = result.current
    expect(state.steps).toHaveLength(1)
    expect(state.currentIndex).toBe(0)
    expect(state.steps[0]).toEqual(testSteps[0])
    expect(state.mode).toBe('stepping')
  })

  it('next() advances through steps', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    act(() => {
      result.current[1].next()
    })

    expect(result.current[0].currentIndex).toBe(1)
    expect(result.current[0].steps[1]).toEqual(testSteps[1])

    act(() => {
      result.current[1].next()
    })

    expect(result.current[0].currentIndex).toBe(2)
  })

  it('prev() goes back to previous step', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    act(() => {
      result.current[1].next()
    })

    act(() => {
      result.current[1].next()
    })

    expect(result.current[0].currentIndex).toBe(2)

    act(() => {
      result.current[1].prev()
    })

    expect(result.current[0].currentIndex).toBe(1)
  })

  it('prev() does nothing at start', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    expect(result.current[0].currentIndex).toBe(0)

    act(() => {
      result.current[1].prev()
    })

    expect(result.current[0].currentIndex).toBe(0)
  })

  it('marks isComplete when generator exhausted', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    // Advance through all steps
    for (let i = 0; i < testSteps.length; i++) {
      act(() => {
        result.current[1].next()
      })
    }

    expect(result.current[0].isComplete).toBe(true)
    expect(result.current[0].steps).toHaveLength(testSteps.length)
  })

  it('jumpToStart() goes to first step', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    act(() => {
      result.current[1].next()
    })

    act(() => {
      result.current[1].next()
    })

    expect(result.current[0].currentIndex).toBe(2)

    act(() => {
      result.current[1].jumpToStart()
    })

    expect(result.current[0].currentIndex).toBe(0)
  })

  it('jumpToEnd() exhausts generator and goes to last step', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    act(() => {
      result.current[1].jumpToEnd()
    })

    expect(result.current[0].isComplete).toBe(true)
    expect(result.current[0].steps).toHaveLength(testSteps.length)
    expect(result.current[0].currentIndex).toBe(testSteps.length - 1)
  })

  it('reset() returns to initial state', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
      result.current[1].next()
    })

    act(() => {
      result.current[1].reset()
    })

    const [state] = result.current
    expect(state.steps).toHaveLength(0)
    expect(state.currentIndex).toBe(-1)
    expect(state.mode).toBe('idle')
  })

  it('getStep() returns step at index', () => {
    const { result } = renderHook(() => useStepThrough())

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
      result.current[1].next()
      result.current[1].next()
    })

    expect(result.current[1].getStep(0)).toEqual(testSteps[0])
    expect(result.current[1].getStep(1)).toEqual(testSteps[1])
    expect(result.current[1].getStep(10)).toBeNull()
  })

  it('calls onStep callback when stepping', () => {
    const onStep = vi.fn()
    const { result } = renderHook(() => useStepThrough(400, onStep))

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    expect(onStep).toHaveBeenCalledWith(testSteps[0], 0)

    act(() => {
      result.current[1].next()
    })

    expect(onStep).toHaveBeenCalledWith(testSteps[1], 1)
  })

  it('calls onComplete callback when done', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useStepThrough(400, undefined, onComplete))

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    // Advance through all steps
    for (let i = 0; i < testSteps.length; i++) {
      act(() => {
        result.current[1].next()
      })
    }

    expect(onComplete).toHaveBeenCalled()
  })

  it('play() auto-advances at specified speed', () => {
    const onStep = vi.fn()
    const { result } = renderHook(() => useStepThrough(100, onStep))

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
    })

    expect(result.current[0].currentIndex).toBe(0)

    act(() => {
      result.current[1].play()
    })

    expect(result.current[0].mode).toBe('playing')

    // Advance time
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current[0].currentIndex).toBe(1)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current[0].currentIndex).toBe(2)
  })

  it('pause() stops auto-play', () => {
    const { result } = renderHook(() => useStepThrough(100))

    act(() => {
      const generator = createTestGenerator(testSteps)
      result.current[1].start(generator)
      result.current[1].play()
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current[0].currentIndex).toBe(1)

    act(() => {
      result.current[1].pause()
    })

    expect(result.current[0].mode).toBe('stepping')

    // Time advances but index should not change
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current[0].currentIndex).toBe(1)
  })
})
