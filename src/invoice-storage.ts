import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { InvoiceData } from './invoice-generator'

export interface SavedInvoice {
  id: string // unique ID for this saved invoice
  configId: string // the invoice config ID (e.g., "xferall-biweekly")
  generatedAt: string // ISO timestamp
  sentAt?: string // ISO timestamp if sent
  invoiceData: InvoiceData
}

// Use ~/.invoice-generator/.invoices/ for consistent storage across all environments
const INVOICES_DIR = path.join(os.homedir(), '.invoice-generator', '.invoices')

/**
 * Ensure the invoices directory exists
 */
function ensureInvoicesDir(): void {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true })
  }
}

/**
 * Generate a unique ID for an invoice
 */
function generateInvoiceId(configId: string): string {
  const timestamp = new Date().getTime()
  return `${configId}-${timestamp}`
}

/**
 * Get the file path for a saved invoice
 */
function getInvoicePath(invoiceId: string): string {
  return path.join(INVOICES_DIR, `${invoiceId}.json`)
}

/**
 * Save an invoice to disk
 */
export function saveInvoice(configId: string, invoiceData: InvoiceData): SavedInvoice {
  ensureInvoicesDir()

  const savedInvoice: SavedInvoice = {
    id: generateInvoiceId(configId),
    configId,
    generatedAt: new Date().toISOString(),
    invoiceData
  }

  const filePath = getInvoicePath(savedInvoice.id)
  fs.writeFileSync(filePath, JSON.stringify(savedInvoice, null, 2))

  return savedInvoice
}

/**
 * Mark an invoice as sent
 */
export function markInvoiceAsSent(invoiceId: string): void {
  const filePath = getInvoicePath(invoiceId)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  const savedInvoice: SavedInvoice = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  savedInvoice.sentAt = new Date().toISOString()

  fs.writeFileSync(filePath, JSON.stringify(savedInvoice, null, 2))
}

/**
 * Load a saved invoice by ID
 */
export function loadInvoice(invoiceId: string): SavedInvoice {
  const filePath = getInvoicePath(invoiceId)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * List all saved invoices, optionally filtered by config ID
 */
export function listInvoices(configId?: string): SavedInvoice[] {
  ensureInvoicesDir()

  const files = fs.readdirSync(INVOICES_DIR)
    .filter(f => f.endsWith('.json'))

  const invoices: SavedInvoice[] = []

  for (const file of files) {
    try {
      const filePath = path.join(INVOICES_DIR, file)
      const invoice: SavedInvoice = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      if (!configId || invoice.configId === configId) {
        invoices.push(invoice)
      }
    } catch (error) {
      // Skip invalid files
      console.error(`Failed to load invoice from ${file}:`, error)
    }
  }

  // Sort by generation date (newest first)
  invoices.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())

  return invoices
}

/**
 * Update an existing saved invoice with new invoice data
 */
export function updateInvoice(invoiceId: string, invoiceData: InvoiceData): SavedInvoice {
  const filePath = getInvoicePath(invoiceId)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  const savedInvoice: SavedInvoice = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  savedInvoice.invoiceData = invoiceData
  savedInvoice.generatedAt = new Date().toISOString()

  fs.writeFileSync(filePath, JSON.stringify(savedInvoice, null, 2))

  return savedInvoice
}

/**
 * Delete a saved invoice
 */
export function deleteInvoice(invoiceId: string): void {
  const filePath = getInvoicePath(invoiceId)

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
