import { vi } from 'vitest'

function unitBoundaryError(boundary: string): Error {
  return new Error(
    `[unit-test harness] Live ${boundary} access is not allowed in *.unit.test.ts. Mock the boundary explicitly or move the scenario to *.integration.test.ts.`,
  )
}

export function forbiddenBoundary(boundary: string): any {
  const fn = vi.fn(() => {
    throw unitBoundaryError(boundary)
  })

  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === 'then') {
        return undefined
      }

      return forbiddenBoundary(`${boundary}.${String(prop)}`)
    },
    apply() {
      throw unitBoundaryError(boundary)
    },
  })
}

export function forbidImport(moduleName: string): never {
  throw new Error(
    `[unit-test harness] ${moduleName} is not allowed in *.unit.test.ts. Use mocked boundaries and direct function/controller tests, or move this case to *.integration.test.ts.`,
  )
}
