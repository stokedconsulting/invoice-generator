import inquirer from 'inquirer'
import chalk from 'chalk'

export interface LineItemCandidate {
  description: string
  hours: number
  selected: boolean
}

interface SelectionResult {
  selectedItems: LineItemCandidate[]
  totalHours: number
}

/**
 * Interactive line item selection
 */
export async function selectLineItems(
  candidates: LineItemCandidate[],
  targetHours: number,
  weekLabel: string
): Promise<LineItemCandidate[]> {
  console.log(chalk.blue(`\n📋 ${weekLabel} - Select line items (target: ${targetHours}hrs)\n`))

  // Create choices with hour display
  const choices = candidates.map((item, index) => ({
    name: `[${item.hours}hr] ${item.description}`,
    value: index,
    checked: false
  }))

  const { selectedIndices } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIndices',
      message: `Select line items for ${weekLabel}:`,
      choices,
      pageSize: 15,
      loop: false
    }
  ])

  if (selectedIndices.length === 0) {
    console.log(chalk.yellow('⚠️  No items selected, using top candidates by default'))
    // Default to top N candidates that fit target hours
    return selectDefaultItems(candidates, targetHours)
  }

  let selectedItems = selectedIndices.map((idx: number) => ({ ...candidates[idx] }))
  let totalSelected = selectedItems.reduce((sum: number, item: LineItemCandidate) => sum + item.hours, 0)

  console.log(chalk.green(`✅ Selected ${selectedItems.length} items (${totalSelected}hrs)`))

  // Allow user to edit individual hours
  selectedItems = await editItemHours(selectedItems)
  totalSelected = selectedItems.reduce((sum: number, item: LineItemCandidate) => sum + item.hours, 0)

  // Adjust hours if needed
  if (totalSelected !== targetHours) {
    const shouldAdjust = await askToAdjustHours(totalSelected, targetHours)
    if (shouldAdjust) {
      return adjustHoursProportionally(selectedItems, targetHours)
    }
  }

  return selectedItems
}

/**
 * Allow user to edit hours for individual selected items
 */
async function editItemHours(items: LineItemCandidate[]): Promise<LineItemCandidate[]> {
  // Display current selections with hours
  console.log(chalk.blue('\n📝 Review selected items:'))
  items.forEach((item, idx) => {
    console.log(chalk.gray(`  ${idx + 1}. [${item.hours}hr] ${item.description.substring(0, 60)}${item.description.length > 60 ? '...' : ''}`))
  })

  const { editChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'editChoice',
      message: 'Would you like to adjust hours for any item?',
      choices: [
        { name: 'Accept all hours as shown', value: 'accept' },
        { name: 'Edit individual item hours', value: 'edit' }
      ]
    }
  ])

  if (editChoice === 'accept') {
    return items
  }

  // Let user pick which items to edit
  const editedItems = [...items]
  let continueEditing = true

  while (continueEditing) {
    const choices = editedItems.map((item, idx) => ({
      name: `[${item.hours}hr] ${item.description.substring(0, 55)}${item.description.length > 55 ? '...' : ''}`,
      value: idx
    }))
    choices.push({ name: chalk.gray('Done editing'), value: -1 })

    const { itemIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'itemIndex',
        message: 'Select item to edit hours:',
        choices,
        pageSize: 10
      }
    ])

    if (itemIndex === -1) {
      continueEditing = false
      continue
    }

    const selectedItem = editedItems[itemIndex]
    const { newHoursStr } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newHoursStr',
        message: `Enter hours for "${selectedItem.description.substring(0, 40)}...":`,
        default: String(selectedItem.hours),
        validate: (input: string) => {
          const num = parseFloat(input)
          if (isNaN(num)) return 'Please enter a valid number'
          if (num <= 0) return 'Hours must be greater than 0'
          if (num > 100) return 'Hours cannot exceed 100'
          return true
        }
      }
    ])
    const newHours = parseFloat(newHoursStr)

    editedItems[itemIndex] = { ...selectedItem, hours: newHours }
    const newTotal = editedItems.reduce((sum, item) => sum + item.hours, 0)
    console.log(chalk.green(`  Updated to ${newHours}hr (new total: ${newTotal}hrs)`))
  }

  // Show final summary after editing
  const finalTotal = editedItems.reduce((sum, item) => sum + item.hours, 0)
  console.log(chalk.blue('\n✏️  Final hours after editing:'))
  editedItems.forEach((item, idx) => {
    console.log(chalk.cyan(`  ${idx + 1}. [${item.hours}hr] ${item.description.substring(0, 55)}${item.description.length > 55 ? '...' : ''}`))
  })
  console.log(chalk.bold(`  Total: ${finalTotal}hrs\n`))

  return editedItems
}

/**
 * Ask if user wants to adjust hours to match target
 */
async function askToAdjustHours(current: number, target: number): Promise<boolean> {
  const diff = target - current
  const message = diff > 0
    ? `Selected total is ${current}hrs, ${diff}hrs under target. Adjust to ${target}hrs?`
    : `Selected total is ${current}hrs, ${Math.abs(diff)}hrs over target. Adjust to ${target}hrs?`

  const { adjust } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'adjust',
      message,
      default: true
    }
  ])

  return adjust
}

/**
 * Adjust hours proportionally to match target
 */
function adjustHoursProportionally(items: LineItemCandidate[], targetHours: number): LineItemCandidate[] {
  const currentTotal = items.reduce((sum, item) => sum + item.hours, 0)
  const ratio = targetHours / currentTotal

  let adjustedTotal = 0
  const adjusted = items.map((item, index) => {
    if (index === items.length - 1) {
      // Last item gets remaining hours
      return {
        ...item,
        hours: targetHours - adjustedTotal
      }
    }

    const newHours = Math.round(item.hours * ratio * 2) / 2 // Round to 0.5
    adjustedTotal += newHours

    return {
      ...item,
      hours: newHours
    }
  })

  console.log(chalk.gray(`  Hours adjusted proportionally to match ${targetHours}hrs`))
  return adjusted
}

/**
 * Select default items when user doesn't choose
 */
function selectDefaultItems(candidates: LineItemCandidate[], targetHours: number): LineItemCandidate[] {
  const selected: LineItemCandidate[] = []
  let totalHours = 0

  for (const candidate of candidates) {
    if (totalHours + candidate.hours <= targetHours) {
      selected.push(candidate)
      totalHours += candidate.hours
    }

    if (totalHours >= targetHours) {
      break
    }
  }

  // If still under, adjust proportionally
  if (totalHours < targetHours && selected.length > 0) {
    return adjustHoursProportionally(selected, targetHours)
  }

  return selected
}

/**
 * Show summary of selections across all weeks
 */
export function showSelectionSummary(weeklySelections: Map<string, LineItemCandidate[]>) {
  console.log(chalk.blue('\n📊 Selection Summary\n'))

  for (const [weekLabel, items] of weeklySelections) {
    const total = items.reduce((sum, item) => sum + item.hours, 0)
    console.log(chalk.bold(`${weekLabel} - ${total}hrs`))
    items.forEach(item => {
      console.log(chalk.gray(`  ${item.hours}hr - ${item.description}`))
    })
    console.log()
  }
}
