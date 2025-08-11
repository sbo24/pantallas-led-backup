import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Configurar mocks globales para testing
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock localStorage para testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})