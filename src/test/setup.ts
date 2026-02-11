import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Global test setup
expect.extend({})

// Mock fetch for spec loading in tests
beforeAll(() => {
  global.fetch = (input: RequestInfo | URL): Promise<Response> => {
    let url: string
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else {
      url = input.url
    }

    // Extract the path from the URL
    const path = url.replace(/^\//, '')

    try {
      // Read the file from the public directory
      const filePath = join(process.cwd(), 'public', path)
      const content = readFileSync(filePath, 'utf-8')

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(content) as unknown),
      } as Response)
    } catch {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' } as unknown),
      } as Response)
    }
  }
})
