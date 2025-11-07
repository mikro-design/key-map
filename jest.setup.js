// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock MapLibre GL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock fetch and Response
global.fetch = jest.fn()
global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  async text() {
    return this.body
  }

  async json() {
    return JSON.parse(this.body)
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock 

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
} 

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock File API
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(parts, filename, options) {
      this.parts = parts
      this.name = filename
      this.type = options?.type || ''
      this.size = parts.reduce((acc, part) => acc + part.length, 0)
    }

    async text() {
      return this.parts.join('')
    }

    async arrayBuffer() {
      const text = await this.text()
      const encoder = new TextEncoder()
      return encoder.encode(text).buffer
    }
  }
} else {
  // Patch existing File class if needed
  const OriginalFile = global.File
  global.File = class File extends OriginalFile {
    async text() {
      if (super.text) {
        return super.text()
      }
      // Fallback for test environments
      return this.parts ? this.parts.join('') : ''
    }
  }
}

// Console suppression removed to allow proper test spying
