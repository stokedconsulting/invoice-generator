import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { InvoiceConfigs, InvoiceConfig } from './types/config'

const HOME_CONFIG_DIR = path.join(os.homedir(), '.invoice-generator')
const HOME_CONFIG_FILE = path.join(HOME_CONFIG_DIR, 'config.json')
const BASE_CONFIG_FILE = path.join(__dirname, '../invoice-configs.json')

/**
 * Get the path to the user's config file
 */
export function getUserConfigPath(): string {
  return HOME_CONFIG_FILE
}

/**
 * Determine which config file to load.
 * Prefers ~/.invoice-generator/config.json, falls back to repo template.
 */
function getConfigPath(): string {
  if (fs.existsSync(HOME_CONFIG_FILE)) {
    return HOME_CONFIG_FILE
  }
  return BASE_CONFIG_FILE
}

/**
 * Ensure the user config exists at ~/.invoice-generator/config.json.
 * If it doesn't exist, copies the base template from the repo.
 */
export function ensureUserConfig(): string {
  if (!fs.existsSync(HOME_CONFIG_DIR)) {
    fs.mkdirSync(HOME_CONFIG_DIR, { recursive: true })
  }

  if (!fs.existsSync(HOME_CONFIG_FILE)) {
    if (!fs.existsSync(BASE_CONFIG_FILE)) {
      throw new Error(`Base config template not found: ${BASE_CONFIG_FILE}`)
    }
    fs.copyFileSync(BASE_CONFIG_FILE, HOME_CONFIG_FILE)
  }

  return HOME_CONFIG_FILE
}

/**
 * Load the invoice configurations from file
 */
export function loadConfigs(): InvoiceConfigs {
  const configFile = getConfigPath()

  if (!fs.existsSync(configFile)) {
    throw new Error(`Config file not found: ${configFile}`)
  }

  const configData = fs.readFileSync(configFile, 'utf-8')
  const configs: InvoiceConfigs = JSON.parse(configData)

  // Validate version
  if (!configs.version) {
    throw new Error('Config file missing version field')
  }

  // Validate invoices array
  if (!Array.isArray(configs.invoices)) {
    throw new Error('Config file missing or invalid invoices array')
  }

  return configs
}

/**
 * Get a specific invoice config by ID
 */
export function getConfigById(id: string): InvoiceConfig | undefined {
  const configs = loadConfigs()
  return configs.invoices.find(inv => inv.id === id)
}

/**
 * Get all enabled invoice configs
 */
export function getEnabledConfigs(): InvoiceConfig[] {
  const configs = loadConfigs()
  return configs.invoices.filter(inv => inv.enabled)
}

/**
 * Check if today matches the schedule for a given config
 */
export function shouldRunToday(config: InvoiceConfig, today: Date = new Date()): boolean {
  const { schedule } = config

  switch (schedule.type) {
    case 'bi-weekly-sunday': {
      // Check if it's Sunday
      if (today.getDay() !== 0) {
        return false
      }

      // Check if it's the right bi-weekly cycle
      if (!schedule.startDate) {
        throw new Error(`bi-weekly-sunday schedule requires a startDate for config ${config.id}`)
      }

      const startDate = new Date(schedule.startDate)
      const weeksSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

      return weeksSinceStart % 2 === 0
    }

    case 'weekly-sunday': {
      return today.getDay() === 0
    }

    case 'monthly-first': {
      return today.getDate() === 1
    }

    case 'monthly-last': {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return tomorrow.getMonth() !== today.getMonth()
    }

    case 'custom': {
      // TODO: Implement cron parsing if needed
      throw new Error('Custom cron schedules not yet implemented')
    }

    default:
      return false
  }
}

/**
 * Get all configs that should run today
 */
export function getConfigsToRunToday(today: Date = new Date()): InvoiceConfig[] {
  const enabled = getEnabledConfigs()
  return enabled.filter(config => shouldRunToday(config, today))
}
