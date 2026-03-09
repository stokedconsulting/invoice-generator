import * as dotenv from 'dotenv'
import * as path from 'path'
import chalk from 'chalk'
import { InvoiceData } from './invoice-generator'

dotenv.config({ path: path.join(__dirname, '../.env') })

export async function postInvoiceToApi(invoiceData: InvoiceData, configId: string): Promise<void> {
  const apiUrl = process.env.INVOICE_API_URL
  const apiKey = process.env.INVOICE_API_KEY

  if (!apiUrl || !apiKey) {
    console.log(chalk.gray('Skipping API post (INVOICE_API_URL or INVOICE_API_KEY not set)'))
    return
  }

  try {
    const response = await fetch(`${apiUrl}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        configId,
        customer: invoiceData.customer,
        startDate: invoiceData.startDate,
        endDate: invoiceData.endDate,
        text: invoiceData.text,
        totalHours: invoiceData.totalHours,
        weeks: invoiceData.weeks.map(w => ({
          dateRange: w.dateRange,
          totalHours: w.totalHours,
          tasks: w.tasks.map(t => ({
            description: t.description,
            hours: t.hours,
          })),
        })),
        generatedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      console.log(chalk.gray('Invoice posted to API'))
    } else {
      const text = await response.text()
      console.warn(chalk.yellow(`Warning: API post failed (${response.status}): ${text}`))
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not post invoice to API: ${error}`))
  }
}
