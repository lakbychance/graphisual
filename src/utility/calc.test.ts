import { describe, it, expect } from 'vitest'
import {
  calculateCurve,
  calculateTextLoc,
  calculateAccurateCoords,
  findToNodeForTouchBasedDevices,
  doesPointLieOnCircle,
} from './calc'
import { INode } from '../components/Graph/IGraph'

describe('Utility Functions', () => {
  describe('calculateCurve', () => {
    it('returns a valid SVG path string', () => {
      const path = calculateCurve(0, 0, 100, 100)

      expect(path).toMatch(/^M/)
      expect(path).toContain('Q')
      expect(typeof path).toBe('string')
    })

    it('starts at the first point', () => {
      const path = calculateCurve(10, 20, 100, 100)

      expect(path).toMatch(/^M10 20/)
    })

    it('ends at the second point', () => {
      const path = calculateCurve(0, 0, 150, 200)

      expect(path).toContain('150 200')
    })
  })

  describe('calculateTextLoc', () => {
    it('returns control point coordinates', () => {
      const { c1x, c1y } = calculateTextLoc(0, 0, 100, 100)

      expect(typeof c1x).toBe('number')
      expect(typeof c1y).toBe('number')
      expect(c1x).not.toBeNaN()
      expect(c1y).not.toBeNaN()
    })

    it('control point is offset from midpoint', () => {
      const { c1x, c1y } = calculateTextLoc(0, 0, 100, 0)

      // Midpoint is (50, 0)
      // Offset should be perpendicular to line (along y-axis)
      expect(c1x).toBeCloseTo(50, 1)
      expect(c1y).not.toBe(0) // Should be offset
    })
  })

  describe('calculateAccurateCoords', () => {
    it('returns coordinates closer to start point', () => {
      const { tempX, tempY } = calculateAccurateCoords(0, 0, 100, 0)

      // Should be 30 units before endpoint (node radius)
      expect(tempX).toBeCloseTo(70, 1)
      expect(tempY).toBeCloseTo(0, 1)
    })

    it('works with diagonal lines', () => {
      // 3-4-5 triangle scaled by 20 (60-80-100)
      const { tempX, tempY } = calculateAccurateCoords(0, 0, 60, 80)

      // Distance is 100, so endpoint should be at distance 70 from origin
      const distance = Math.sqrt(tempX * tempX + tempY * tempY)
      expect(distance).toBeCloseTo(70, 1)
    })

    it('handles vertical lines', () => {
      const { tempX, tempY } = calculateAccurateCoords(50, 0, 50, 100)

      expect(tempX).toBeCloseTo(50, 1)
      expect(tempY).toBeCloseTo(70, 1)
    })
  })

  describe('doesPointLieOnCircle', () => {
    it('returns true for point inside circle', () => {
      // Circle at (50, 50) with radius 30
      // Point at (55, 55) should be inside
      const result = doesPointLieOnCircle(55, 55, 30, 50, 50)
      expect(result).toBe(true)
    })

    it('returns true for point on circle edge', () => {
      // Circle at (50, 50) with radius 30
      // Point at (80, 50) is exactly on edge
      const result = doesPointLieOnCircle(80, 50, 30, 50, 50)
      expect(result).toBe(true)
    })

    it('returns false for point outside circle', () => {
      // Circle at (50, 50) with radius 30
      // Point at (100, 100) is outside
      const result = doesPointLieOnCircle(100, 100, 30, 50, 50)
      expect(result).toBe(false)
    })

    it('returns true for point at center', () => {
      const result = doesPointLieOnCircle(50, 50, 30, 50, 50)
      expect(result).toBe(true)
    })
  })

  describe('findToNodeForTouchBasedDevices', () => {
    const nodes: INode[] = [
      { id: 1, x: 50, y: 50, r: 30 },
      { id: 2, x: 150, y: 50, r: 30 },
      { id: 3, x: 100, y: 150, r: 30 },
    ]

    it('finds node when point is inside', () => {
      // Point near node 1
      const found = findToNodeForTouchBasedDevices(55, 55, nodes)
      expect(found?.id).toBe(1)
    })

    it('returns undefined when point is outside all nodes', () => {
      const found = findToNodeForTouchBasedDevices(200, 200, nodes)
      expect(found).toBeUndefined()
    })

    it('finds correct node among multiple', () => {
      // Point near node 2
      const found = findToNodeForTouchBasedDevices(155, 55, nodes)
      expect(found?.id).toBe(2)
    })

    it('returns first matching node if overlapping', () => {
      // If nodes overlap, returns first one found
      const overlappingNodes: INode[] = [
        { id: 1, x: 50, y: 50, r: 30 },
        { id: 2, x: 60, y: 50, r: 30 }, // Overlaps with 1
      ]
      const found = findToNodeForTouchBasedDevices(55, 50, overlappingNodes)
      expect(found?.id).toBe(1)
    })

    it('returns undefined for empty nodes array', () => {
      const found = findToNodeForTouchBasedDevices(50, 50, [])
      expect(found).toBeUndefined()
    })
  })
})
