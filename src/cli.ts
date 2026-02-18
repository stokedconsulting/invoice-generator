#!/usr/bin/env node

import { Command } from 'commander'
import { generateInvoice, generateInvoiceFromConfig } from './invoice-generator'
import { sendInvoiceEmail, sendInvoiceEmailFromConfig } from './email-sender'
import { loadConfigs, getConfigById } from './config-loader'
import { saveInvoice, listInvoices, loadInvoice, markInvoiceAsSent } from './invoice-storage'
import chalk from 'chalk'
import { format } from 'date-fns'
import inquirer from 'inquirer'

const program = new Command()

program
  .name('invoice')
  .description('Generate and send invoices based on git commit history')
  .version('2.0.0')

// Legacy command - direct customer name
program
  .command('legacy <customer>')
  .description('Generate invoice using legacy customer name lookup (deprecated)')
  .option('-t, --test', 'Test mode - only send to b@stokedconsulting.com')
  .option('-w, --weeks <number>', 'Number of weeks to include (default: 2)', '2')
  .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date (YYYY-MM-DD)')
  .option('-d, --dry-run', 'Generate invoice without sending email')
  .option('-v, --verbose', 'Verbose output')
  .action(async (customer, options) => {
    try {
      console.log(chalk.blue(`🚀 Generating invoice for ${customer}...`))

      // Generate the invoice
      const invoiceData = await generateInvoice({
        customer,
        weeks: parseInt(options.weeks),
        startDate: options.startDate,
        endDate: options.endDate,
        verbose: options.verbose
      })

      if (!invoiceData) {
        console.error(chalk.red('Failed to generate invoice'))
        process.exit(1)
      }

      console.log(chalk.green('\n✅ Invoice generated successfully!\n'))
      console.log(chalk.gray('─'.repeat(60)))
      console.log(invoiceData.text)
      console.log(chalk.gray('─'.repeat(60)))

      if (options.dryRun) {
        console.log(chalk.yellow('\n📋 Dry run mode - email not sent'))
        return
      }

      // Send the email
      console.log(chalk.blue('\n📧 Sending invoice email...'))

      const emailResult = await sendInvoiceEmail({
        ...invoiceData,
        testMode: options.test,
        verbose: options.verbose
      })

      if (emailResult.success) {
        console.log(chalk.green(`✅ Invoice email sent successfully!`))
        if (options.test) {
          console.log(chalk.yellow('Test mode: Only sent to b@stokedconsulting.com'))
        }
      } else {
        console.error(chalk.red(`❌ Failed to send email: ${emailResult.error}`))
        process.exit(1)
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error)
      process.exit(1)
    }
  })

// New config-based command (default)
program
  .argument('[config-id]', 'Invoice configuration ID (from invoice-configs.json). If not provided, lists available configs.')
  .option('-t, --test', 'Send to test email only (b@stokedconsulting.com)')
  .option('-s, --send', 'Send to customer emails (with confirmation prompt)')
  .option('--send-existing', 'Send a previously generated invoice')
  .option('-c, --context <text>', 'Optional context to guide invoice focus (e.g., "Focus on patient transfer dashboard features")')
  .option('-w, --weeks <number>', 'Number of weeks to include (overrides config default)', parseInt)
  .option('--scope <number>', 'Number of weeks to collect commits from (default: same as weeks)', parseInt)
  .option('-i, --interactive', 'Interactive mode - choose from AI-generated line item options')
  .option('-v, --verbose', 'Verbose output')
  .option('-l, --list', 'List all available invoice configurations')
  .action(async (configId, options) => {
    try {
      const configs = loadConfigs()

      // Send existing invoice mode
      if (options.sendExisting) {
        if (!configId) {
          console.error(chalk.red('❌ Config ID required for --send-existing'))
          console.log(chalk.yellow('\nUsage: invoice-gen <config-id> --send-existing'))
          process.exit(1)
        }

        const config = getConfigById(configId)
        if (!config) {
          console.error(chalk.red(`❌ Configuration '${configId}' not found`))
          process.exit(1)
        }

        // List saved invoices for this config
        const savedInvoices = listInvoices(configId)

        if (savedInvoices.length === 0) {
          console.log(chalk.yellow(`\n📭 No saved invoices found for '${configId}'`))
          console.log(chalk.gray('Generate an invoice first to save it for later sending'))
          process.exit(0)
        }

        console.log(chalk.blue(`\n📋 Saved Invoices for ${config.name}:\n`))

        // Create choices for inquirer
        const choices = savedInvoices.map(inv => {
          const sentLabel = inv.sentAt ? chalk.green(' [SENT]') : ''
          const generatedDate = format(new Date(inv.generatedAt), 'MMM dd, yyyy HH:mm')
          return {
            name: `${inv.invoiceData.startDate} - ${inv.invoiceData.endDate} (${generatedDate})${sentLabel}`,
            value: inv.id,
            short: `${inv.invoiceData.startDate} - ${inv.invoiceData.endDate}`
          }
        })

        // Add option to cancel
        choices.push({
          name: chalk.gray('Cancel'),
          value: 'cancel',
          short: 'Cancel'
        })

        const { selectedInvoiceId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedInvoiceId',
            message: 'Select an invoice to send:',
            choices
          }
        ])

        if (selectedInvoiceId === 'cancel') {
          console.log(chalk.gray('\nCancelled'))
          process.exit(0)
        }

        const savedInvoice = loadInvoice(selectedInvoiceId)

        // Show the invoice text
        console.log(chalk.green('\n✅ Invoice loaded:\n'))
        console.log(chalk.gray('─'.repeat(60)))
        console.log(savedInvoice.invoiceData.text)
        console.log(chalk.gray('─'.repeat(60)))

        // Preview or send
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Send to test email', value: 'test' },
              { name: 'Send to customers', value: 'send' },
              { name: 'Cancel', value: 'cancel' }
            ]
          }
        ])

        if (action === 'cancel') {
          console.log(chalk.gray('\nCancelled'))
          process.exit(0)
        }

        const testMode = action === 'test'

        // Show confirmation for customer send
        if (!testMode) {
          console.log(chalk.yellow('\n⚠️  CONFIRMATION REQUIRED'))
          console.log(chalk.cyan('\nInvoice will be sent to:'))
          config.email.to.forEach(email => console.log(chalk.cyan(`  To: ${email}`)))
          if (config.email.cc && config.email.cc.length > 0) {
            config.email.cc.forEach(email => console.log(chalk.gray(`  CC: ${email}`)))
          }

          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Send invoice to customers?',
              default: false
            }
          ])

          if (!confirm) {
            console.log(chalk.gray('\nInvoice send cancelled'))
            process.exit(0)
          }
        }

        // Send the email
        console.log(chalk.blue(testMode ? '\n📧 Sending to test email...' : '\n📧 Sending invoice to customers...'))

        const emailResult = await sendInvoiceEmailFromConfig({
          config,
          ...savedInvoice.invoiceData,
          testMode,
          verbose: options.verbose
        })

        if (emailResult.success) {
          if (!testMode) {
            markInvoiceAsSent(selectedInvoiceId)
          }
          console.log(chalk.green(testMode ? '\n✅ Test invoice sent to b@stokedconsulting.com' : '\n✅ Invoice sent successfully!'))
        } else {
          console.error(chalk.red(`❌ Failed to send email: ${emailResult.error}`))
          process.exit(1)
        }

        return
      }

      // List mode
      if (options.list || !configId) {
        console.log(chalk.blue('\n📋 Available Invoice Configurations:\n'))
        configs.invoices.forEach(config => {
          const status = config.enabled ? chalk.green('✓ enabled') : chalk.gray('✗ disabled')
          console.log(`  ${chalk.bold(config.id)} - ${config.name}`)
          console.log(`    Customer: ${config.customer}`)
          console.log(`    Schedule: ${config.schedule.type}`)
          console.log(`    Status: ${status}`)
          console.log()
        })
        return
      }

      // Find the config
      const config = getConfigById(configId)
      if (!config) {
        console.error(chalk.red(`❌ Configuration '${configId}' not found`))
        console.log(chalk.yellow('\nAvailable configurations:'))
        configs.invoices.forEach(c => console.log(`  - ${c.id}`))
        process.exit(1)
      }

      console.log(chalk.blue(`🚀 Generating invoice: ${config.name}`))
      console.log(chalk.gray(`   Customer: ${config.customer}`))
      console.log(chalk.gray(`   Schedule: ${config.schedule.type}`))
      if (options.weeks) {
        console.log(chalk.yellow(`   Weeks: ${options.weeks} (overriding config default)`))
      }
      if (options.scope) {
        console.log(chalk.yellow(`   Commit Scope: ${options.scope} weeks`))
      }
      if (options.context) {
        console.log(chalk.cyan(`   Context: ${options.context}`))
      }
      if (options.interactive) {
        console.log(chalk.magenta(`   Mode: Interactive (you'll choose line items)`))
      }
      console.log()

      // Generate the invoice
      const invoiceData = await generateInvoiceFromConfig({
        config,
        runtimeContext: options.context,
        weeksOverride: options.weeks,
        scopeOverride: options.scope,
        interactive: options.interactive,
        verbose: options.verbose
      })

      if (!invoiceData) {
        console.error(chalk.red('Failed to generate invoice'))
        process.exit(1)
      }

      // Save the invoice
      const savedInvoice = saveInvoice(configId, invoiceData)

      console.log(chalk.green('\n✅ Invoice generated successfully!\n'))
      console.log(chalk.gray('─'.repeat(60)))
      console.log(invoiceData.text)
      console.log(chalk.gray('─'.repeat(60)))
      console.log(chalk.gray(`\n💾 Invoice saved (ID: ${savedInvoice.id})`))

      // Default behavior: display only (safe)
      if (!options.test && !options.send) {
        console.log(chalk.blue('\n📋 Invoice displayed (no email sent)'))
        console.log(chalk.gray('Use --test to send to test email'))
        console.log(chalk.gray('Use --send to send to customers'))
        console.log(chalk.gray(`Use --send-existing to send this invoice later`))
        return
      }

      // Test mode
      if (options.test) {
        console.log(chalk.yellow('\n📧 Sending to test email...'))

        const emailResult = await sendInvoiceEmailFromConfig({
          config,
          ...invoiceData,
          testMode: true,
          verbose: options.verbose
        })

        if (emailResult.success) {
          console.log(chalk.green(`✅ Test invoice sent to b@stokedconsulting.com`))
        } else {
          console.error(chalk.red(`❌ Failed to send email: ${emailResult.error}`))
          process.exit(1)
        }
        return
      }

      // Send mode (with confirmation)
      if (options.send) {
        console.log(chalk.yellow('\n⚠️  CONFIRMATION REQUIRED'))
        console.log(chalk.cyan('\nInvoice will be sent to:'))
        config.email.to.forEach(email => console.log(chalk.cyan(`  To: ${email}`)))
        if (config.email.cc && config.email.cc.length > 0) {
          config.email.cc.forEach(email => console.log(chalk.gray(`  CC: ${email}`)))
        }
        if (config.email.bcc && config.email.bcc.length > 0) {
          config.email.bcc.forEach(email => console.log(chalk.gray(`  BCC: ${email}`)))
        }

        console.log(chalk.cyan('\nInvoice Summary:'))
        console.log(chalk.gray(`  Period: ${invoiceData.startDate} - ${invoiceData.endDate}`))
        console.log(chalk.gray(`  Total Hours: ${invoiceData.totalHours}`))
        console.log(chalk.gray(`  Customer: ${config.customer}`))

        // Prompt for confirmation
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        })

        const answer = await new Promise<string>(resolve => {
          readline.question(chalk.yellow('\n\nSend invoice? (y/n): '), resolve)
        })
        readline.close()

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.gray('\nInvoice send cancelled'))
          return
        }

        console.log(chalk.blue('\n📧 Sending invoice to customers...'))

        const emailResult = await sendInvoiceEmailFromConfig({
          config,
          ...invoiceData,
          testMode: false,
          verbose: options.verbose
        })

        if (emailResult.success) {
          markInvoiceAsSent(savedInvoice.id)
          console.log(chalk.green(`\n✅ Invoice sent successfully!`))
        } else {
          console.error(chalk.red(`❌ Failed to send email: ${emailResult.error}`))
          process.exit(1)
        }
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error)
      process.exit(1)
    }
  })

program.parse()