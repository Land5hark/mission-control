import { NextResponse } from 'next/server'
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { APP_VERSION } from '@/lib/version'

const UPDATE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const MAX_BUFFER = 10 * 1024 * 1024 // 10 MB

const EXEC_OPTS = {
  timeout: UPDATE_TIMEOUT,
  maxBuffer: MAX_BUFFER,
  encoding: 'utf-8' as const,
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { ...EXEC_OPTS, cwd }).trim()
}

function pnpm(args: string[], cwd: string): string {
  return execFileSync('pnpm', args, { ...EXEC_OPTS, cwd }).trim()
}

export async function POST(request: Request) {
  const auth = requireRole(request, 'admin')
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const user = auth.user!
  const cwd = process.cwd()
  const steps: { step: string; output: string }[] = []

  try {
    // 1. Check for uncommitted changes
    const status = git(['status', '--porcelain'], cwd)
    if (status) {
      return NextResponse.json(
        {
          error: 'Working tree has uncommitted changes. Please commit or stash them before updating.',
          dirty: true,
          files: status.split('\n').slice(0, 20),
        },
        { status: 409 }
      )
    }

    // 2. Detect current branch
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)

    // 3. Fetch latest
    const fetchOut = git(['fetch', 'origin'], cwd)
    steps.push({ step: 'git fetch', output: fetchOut || 'OK' })

    // 4. Pull
    const pullOut = git(['pull', 'origin', branch], cwd)
    steps.push({ step: 'git pull', output: pullOut })

    // 5. Install dependencies
    const installOut = pnpm(['install', '--frozen-lockfile'], cwd)
    steps.push({ step: 'pnpm install', output: installOut })

    // 6. Build
    const buildOut = pnpm(['build'], cwd)
    steps.push({ step: 'pnpm build', output: buildOut })

    // 7. Read new version from package.json
    const newPkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'))
    const newVersion: string = newPkg.version ?? APP_VERSION

    // 8. Log to audit_log
    try {
      const db = getDatabase()
      db.prepare(
        'INSERT INTO audit_log (action, actor, detail) VALUES (?, ?, ?)'
      ).run(
        'system.update',
        user.username,
        JSON.stringify({
          previousVersion: APP_VERSION,
          newVersion,
          branch,
        })
      )
    } catch {
      // Non-critical -- don't fail the update if audit logging fails
    }

    return NextResponse.json({
      success: true,
      previousVersion: APP_VERSION,
      newVersion,
      branch,
      steps,
      restartRequired: true,
    })
  } catch (err: any) {
    const message =
      err?.stderr?.toString?.()?.trim() ||
      err?.stdout?.toString?.()?.trim() ||
      err?.message ||
      'Unknown error during update'

    return NextResponse.json(
      {
        error: 'Update failed',
        detail: message,
        steps,
      },
      { status: 500 }
    )
  }
}
