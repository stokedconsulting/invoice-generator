import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawnSync } from 'child_process'
import { format } from 'date-fns'

export interface EditedWeek {
  dateRange: string
  totalHours: number
  tasks: Array<{ description: string; hours: number }>
}

export interface InvoiceEditorResult {
  weeks: EditedWeek[]
  wasEdited: boolean
}

export interface BucketTask {
  description: string
  subTasks: string[]
  type: 'ordered' | 'unordered'
  originalIndex: number
}

export interface BucketEditorResult {
  tasks: BucketTask[]
  wasEdited: boolean
}

export interface AssignedBucketTask {
  description: string
  weekIndex: number
  source: BucketTask
}

/**
 * Open $EDITOR with a bucket template and parse the result
 */
export function openBucketEditor(
  invoicePeriod: string,
  hoursPerWeek: number,
  weeks: number
): BucketEditorResult {
  const tempFile = path.join(os.tmpdir(), `invoice-buckets-${Date.now()}.md`)

  const template = buildTemplate(invoicePeriod, hoursPerWeek, weeks)
  fs.writeFileSync(tempFile, template)

  const editor = findEditor()
  const result = spawnSync(editor, [tempFile], { stdio: 'inherit' })

  if (result.status !== 0) {
    // Editor exited with error or was killed — treat as cancellation
    cleanupFile(tempFile)
    return { tasks: [], wasEdited: false }
  }

  let content: string
  try {
    content = fs.readFileSync(tempFile, 'utf-8')
  } catch {
    return { tasks: [], wasEdited: false }
  } finally {
    cleanupFile(tempFile)
  }

  const tasks = parseBucketContent(content)

  if (tasks.length === 0) {
    return { tasks: [], wasEdited: false }
  }

  return { tasks, wasEdited: true }
}

/**
 * Parse bucket markdown content into structured tasks
 */
export function parseBucketContent(content: string): BucketTask[] {
  const lines = content.split('\n')
  const tasks: BucketTask[] = []
  let currentParent: BucketTask | null = null
  let topLevelIndex = 0

  for (const line of lines) {
    // Skip comment lines and empty lines
    if (/^\s*#/.test(line) || line.trim() === '') {
      continue
    }

    // Ordered item: "1. Description"
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/)
    if (orderedMatch) {
      currentParent = {
        description: orderedMatch[2].trim(),
        subTasks: [],
        type: 'ordered',
        originalIndex: topLevelIndex++
      }
      tasks.push(currentParent)
      continue
    }

    // Check indentation to distinguish sub-tasks from top-level unordered
    const indentMatch = line.match(/^(\s*)[-*]\s+(.+)$/)
    if (indentMatch) {
      const indent = indentMatch[1].length
      const text = indentMatch[2].trim()

      if (indent >= 2 && currentParent) {
        // Nested sub-task — append to current parent
        currentParent.subTasks.push(text)
      } else {
        // Top-level unordered item
        currentParent = {
          description: text,
          subTasks: [],
          type: 'unordered',
          originalIndex: topLevelIndex++
        }
        tasks.push(currentParent)
      }
    }
  }

  return tasks
}

/**
 * Assign tasks to weeks based on type and commit evidence
 */
export function assignTasksToWeeks(
  tasks: BucketTask[],
  weeklyCommits: Array<Array<{ message: string }>>,
  weekCount: number
): AssignedBucketTask[] {
  const assigned: AssignedBucketTask[] = []
  const weekLoads = new Array(weekCount).fill(0) // track how many tasks per week

  const ordered = tasks.filter(t => t.type === 'ordered')
  const unordered = tasks.filter(t => t.type === 'unordered')

  // --- Ordered tasks: strict sequential distribution ---
  if (ordered.length > 0) {
    const tasksPerWeek = Math.ceil(ordered.length / weekCount)

    for (let i = 0; i < ordered.length; i++) {
      const weekIndex = Math.min(Math.floor(i / tasksPerWeek), weekCount - 1)
      assigned.push({
        description: mergeDescription(ordered[i]),
        weekIndex,
        source: ordered[i]
      })
      weekLoads[weekIndex]++
    }
  }

  // --- Unordered tasks: keyword-match against commits, fallback to list order ---
  for (const task of unordered) {
    const keywords = extractKeywords(task.description)
    let bestWeek = -1
    let bestScore = 0

    for (let w = 0; w < weekCount; w++) {
      const commits = weeklyCommits[w] || []
      const score = scoreKeywordsAgainstCommits(keywords, commits)

      if (score > bestScore) {
        bestScore = score
        bestWeek = w
      }
    }

    if (bestWeek >= 0 && bestScore > 0) {
      assigned.push({
        description: mergeDescription(task),
        weekIndex: bestWeek,
        source: task
      })
      weekLoads[bestWeek]++
    } else {
      // No evidence — assign to least-loaded week
      const leastLoaded = weekLoads.indexOf(Math.min(...weekLoads))
      assigned.push({
        description: mergeDescription(task),
        weekIndex: leastLoaded,
        source: task
      })
      weekLoads[leastLoaded]++
    }
  }

  return assigned
}

/**
 * Open $EDITOR with an existing invoice for editing
 */
export function openInvoiceEditor(invoiceText: string): InvoiceEditorResult {
  const tempFile = path.join(os.tmpdir(), `invoice-edit-${Date.now()}.txt`)

  const template = `# Edit your invoice below.
# Lines starting with # are comments and will be ignored.
#
# FORMAT:
#   Week header:  February 2 - February 8, 2025 ----- 30hrs
#   Line item:    10hr - Task description
#
# TIPS:
#   - Cut/paste lines to move tasks between weeks
#   - Change hour numbers to adjust time
#   - Add or remove line items freely
#   - Week totals will be recalculated from line items
#   - Lines with 0 hours will be removed
#   - Blank lines and unrecognized lines are ignored

${invoiceText}
`

  fs.writeFileSync(tempFile, template)

  const editor = findEditor()
  const result = spawnSync(editor, [tempFile], { stdio: 'inherit' })

  if (result.status !== 0) {
    cleanupFile(tempFile)
    return { weeks: [], wasEdited: false }
  }

  let content: string
  try {
    content = fs.readFileSync(tempFile, 'utf-8')
  } catch {
    return { weeks: [], wasEdited: false }
  } finally {
    cleanupFile(tempFile)
  }

  const weeks = parseInvoiceContent(content)

  if (weeks.length === 0) {
    return { weeks: [], wasEdited: false }
  }

  return { weeks, wasEdited: true }
}

/**
 * Parse edited invoice content back into structured weeks
 */
export function parseInvoiceContent(content: string): EditedWeek[] {
  const lines = content.split('\n')
  const weeks: EditedWeek[] = []
  let currentWeek: EditedWeek | null = null
  const warnings: string[] = []

  const weekHeaderRegex = /^(.+?)\s+-{3,}\s+(\d+(?:\.\d+)?)hrs?$/
  const lineItemRegex = /^(\d+(?:\.\d+)?)hr\s*-\s*(.+)$/

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    // Try week header
    const weekMatch = trimmed.match(weekHeaderRegex)
    if (weekMatch) {
      currentWeek = {
        dateRange: weekMatch[1].trim(),
        totalHours: 0, // will be recalculated
        tasks: []
      }
      weeks.push(currentWeek)
      continue
    }

    // Try line item
    const itemMatch = trimmed.match(lineItemRegex)
    if (itemMatch) {
      const hours = parseFloat(itemMatch[1])
      const description = itemMatch[2].trim()

      if (hours <= 0) {
        continue // filter out 0-hour items
      }

      if (!currentWeek) {
        warnings.push(`Skipping orphan line item (no week header above): "${trimmed}"`)
        continue
      }

      currentWeek.tasks.push({ description, hours })
      continue
    }

    // Unrecognized line — skip with warning
    warnings.push(`Skipping unrecognized line: "${trimmed}"`)
  }

  // Recalculate totalHours per week from line items
  for (const week of weeks) {
    week.totalHours = week.tasks.reduce((sum, t) => sum + t.hours, 0)
  }

  // Print warnings
  for (const warning of warnings) {
    console.warn(`⚠️  ${warning}`)
  }

  return weeks
}

// --- Internal helpers ---

function buildTemplate(invoicePeriod: string, hoursPerWeek: number, weeks: number): string {
  return `# Invoice Task Buckets
# Period: ${invoicePeriod}
# Hours/week: ${hoursPerWeek} | Weeks: ${weeks}
#
# INSTRUCTIONS:
#   Lines starting with # are comments and will be ignored.
#
#   ORDERED LIST (numbered) — strict sequential week assignment:
#     Tasks are distributed across weeks in order.
#     1. First week task
#     2. Second week task
#     3. Third week task
#
#   UNORDERED LIST (dashes) — matched to weeks by commit evidence:
#     Tasks are placed in the week whose commits best match.
#     If no match is found, tasks fill weeks by list order.
#     - Some feature work
#     - Bug fixes and maintenance
#
#   NESTED SUB-TASKS — indent 2+ spaces under a parent:
#     - Parent task
#       - Sub-task detail
#       - Another sub-task
#
# Write your tasks below (comments are ignored automatically):

`
}

function findEditor(): string {
  if (process.env.EDITOR) {
    return process.env.EDITOR
  }

  // Try vim, then vi
  for (const candidate of ['vim', 'vi']) {
    const check = spawnSync('which', [candidate], { stdio: 'pipe' })
    if (check.status === 0) {
      return candidate
    }
  }

  // Last resort
  return 'vi'
}

function cleanupFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath)
  } catch {
    // Ignore cleanup errors
  }
}

function mergeDescription(task: BucketTask): string {
  if (task.subTasks.length === 0) {
    return task.description
  }
  return `${task.description} - ${task.subTasks.join('; ')}`
}

function extractKeywords(text: string): string[] {
  // Split on non-alphanumeric, lowercase, filter short/stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into',
    'also', 'been', 'have', 'has', 'was', 'were', 'are', 'will',
    'can', 'may', 'not', 'but', 'all', 'any', 'each', 'some'
  ])

  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

function scoreKeywordsAgainstCommits(
  keywords: string[],
  commits: Array<{ message: string }>
): number {
  let score = 0
  const commitText = commits.map(c => c.message.toLowerCase()).join(' ')

  for (const keyword of keywords) {
    if (commitText.includes(keyword)) {
      score++
    }
  }

  return score
}
