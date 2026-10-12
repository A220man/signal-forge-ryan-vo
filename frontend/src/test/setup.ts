import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver for globe.gl
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
globalThis.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))