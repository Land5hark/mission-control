import fs from 'node:fs'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

interface OpenClawGatewayConfig {
  gateway?: {
    auth?: {
      token?: string
    }
    port?: number
    controlUi?: {
      dashboardUrl?: string
      allowedOrigins?: string[]
    }
  }
}

function readOpenClawConfig(): OpenClawGatewayConfig | null {
  const configPath = config.openclawConfigPath
  if (!configPath || !fs.existsSync(configPath)) return null
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(raw) as OpenClawGatewayConfig
  } catch {
    return null
  }
}

export function registerMcAsDashboard(mcUrl: string): { registered: boolean; alreadySet: boolean } {
  const configPath = config.openclawConfigPath
  if (!configPath || !fs.existsSync(configPath)) {
    return { registered: false, alreadySet: false }
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, any>

    // Ensure nested structure
    if (!parsed.gateway) parsed.gateway = {}
    if (!parsed.gateway.controlUi) parsed.gateway.controlUi = {}

    const currentUrl = parsed.gateway.controlUi.dashboardUrl
    const origin = new URL(mcUrl).origin

    // Check if already configured correctly
    if (currentUrl === mcUrl) {
      // Still ensure origin is in allowedOrigins
      const origins: string[] = parsed.gateway.controlUi.allowedOrigins || []
      if (!origins.includes(origin)) {
        origins.push(origin)
        parsed.gateway.controlUi.allowedOrigins = origins
        fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2) + '\n')
        logger.info({ origin }, 'Added MC origin to allowedOrigins')
      }
      return { registered: false, alreadySet: true }
    }

    // Write dashboardUrl and ensure allowedOrigins
    parsed.gateway.controlUi.dashboardUrl = mcUrl
    const origins: string[] = parsed.gateway.controlUi.allowedOrigins || []
    if (!origins.includes(origin)) {
      origins.push(origin)
    }
    parsed.gateway.controlUi.allowedOrigins = origins

    fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2) + '\n')
    logger.info({ mcUrl, origin }, 'Registered MC as default dashboard')
    return { registered: true, alreadySet: false }
  } catch (err) {
    logger.error({ err }, 'Failed to register MC as dashboard')
    return { registered: false, alreadySet: false }
  }
}

export function getDetectedGatewayToken(): string {
  const envToken = (process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_TOKEN || '').trim()
  if (envToken) return envToken

  const parsed = readOpenClawConfig()
  const cfgToken = String(parsed?.gateway?.auth?.token || '').trim()
  return cfgToken
}

export function getDetectedGatewayPort(): number | null {
  const envPort = Number(process.env.OPENCLAW_GATEWAY_PORT || process.env.GATEWAY_PORT || '')
  if (Number.isFinite(envPort) && envPort > 0) return envPort

  const parsed = readOpenClawConfig()
  const cfgPort = Number(parsed?.gateway?.port || 0)
  return Number.isFinite(cfgPort) && cfgPort > 0 ? cfgPort : null
}
