// Loud env-var guard. Routes call requireEnv() at the top so misconfigured
// deploys fail fast with a clear server log instead of leaking 500s later.
export function requireEnv(names: readonly string[]): void {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length > 0) {
    const msg = `Missing required env vars: ${missing.join(', ')}`
    console.error(msg)
    throw new Error(msg)
  }
}
