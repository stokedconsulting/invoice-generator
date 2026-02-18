import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { InvoiceConfig } from './types/config'

const execAsync = promisify(exec)

interface CommitData {
  message: string
  date: Date
  repo: string
}

interface AIAnalysisResult {
  codeAnalysis?: string
  lineItems?: string
}

const DEFAULT_CODE_ANALYSIS_PROMPT = `You are analyzing git commits and code changes for an invoice.

Your task: Review the provided commit messages and identify what was actually built, fixed, or improved.

Focus on:
- Specific features added (not generic "new features")
- Specific bugs fixed (not generic "bug fixes")
- Infrastructure/DevOps changes
- Performance improvements
- Refactoring with clear business value

Be concise but specific. Write in past tense. Group related work together.

Output format: A detailed analysis of work completed, organized by theme or feature area.

Example output:
"Enhanced fax queue system with RethinkDB migration, including real-time status updates and improved error handling. Fixed authentication issues in getSentFax endpoint with proper user credential checking. Improved S3 configuration for document storage with correct region settings and bucket separation."

Commit data will be provided below. Analyze and summarize the actual work done:`

const DEFAULT_LINE_ITEM_PROMPT = `You are generating professional invoice line items from a code analysis.

Your task: Convert the technical analysis into clear, client-friendly invoice line items with hour estimates.

Guidelines:
- Use professional, non-technical language
- Be specific about what was delivered
- Each line item should describe tangible value
- Assign realistic hours based on complexity
- Group related work into logical line items
- Total hours must match the specified amount

Format each line item as:
[hours]hr - [Description of work]

Example:
12hr - Enhanced fax queue system with real-time status tracking and error recovery
8hr - Resolved authentication and access control issues across API endpoints
6hr - Improved document storage infrastructure and performance
4hr - Code refactoring and technical debt reduction

The code analysis and total hours will be provided below. Generate professional line items:`

const INTERACTIVE_LINE_ITEM_PROMPT = `You are generating a LARGE POOL of professional invoice line item candidates for interactive selection.

Your task: Generate 15-20 diverse line item options covering all aspects of the work, with hour estimates.

IMPORTANT:
- Generate MORE items than needed (15-20 options for user to choose from)
- Vary the granularity (some broad items, some specific items)
- Include different groupings of the same work
- Total hours across ALL candidates will exceed target (that's intentional)
- Each line item should stand alone and make sense independently

Guidelines:
- Use professional, non-technical language
- Be specific about what was delivered
- Each line item should describe tangible value
- Assign realistic hours based on complexity
- Offer variety: feature-focused, bug-focused, infrastructure-focused, etc.

Format each line item as:
[hours]hr - [Description of work]

Example output (showing variety):
8hr - Enhanced fax queue system with real-time status tracking
4hr - Implemented automated error recovery for fax processing
6hr - Resolved authentication issues across API endpoints
3hr - Fixed access control bugs in user management
5hr - Improved document storage infrastructure
4hr - Optimized S3 configuration and performance
7hr - Comprehensive fax system improvements (alternative broader grouping)
3hr - Code refactoring and technical debt reduction
2hr - UI/UX improvements for admin interface
4hr - Database query optimization and indexing

The code analysis and target hours will be provided below. Generate 15-20 diverse line item candidates:`

/**
 * Run Claude Code CLI with a prompt
 */
async function runClaudeCLI(prompt: string, verbose?: boolean): Promise<string> {
  try {
    if (verbose) {
      console.log('Running Claude Code analysis...')
    }

    // Create temp file for prompt
    const tempDir = os.tmpdir()
    const promptFile = path.join(tempDir, `invoice-prompt-${Date.now()}.txt`)
    fs.writeFileSync(promptFile, prompt)

    // Run claude code with the prompt
    const command = `claude code --dangerously-skip-permissions < "${promptFile}"`

    if (verbose) {
      console.log(`Executing: ${command}`)
    }

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
      shell: '/bin/bash'
    })

    // Clean up temp file
    try {
      fs.unlinkSync(promptFile)
    } catch {
      // Ignore cleanup errors
    }

    if (stderr && verbose) {
      console.log('Claude stderr:', stderr)
    }

    return stdout.trim()
  } catch (error) {
    throw new Error(`Claude CLI error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Stage 1: Analyze code changes from commits
 */
export async function analyzeCodeChanges(
  commits: CommitData[],
  config: InvoiceConfig,
  runtimeContext?: string,
  verbose?: boolean
): Promise<string> {
  if (!config.ai?.enabled || !config.ai?.codeAnalysis?.enabled) {
    return ''
  }

  if (verbose) {
    console.log(`\n🤖 AI Stage 1: Analyzing ${commits.length} commits...`)
  }

  // Prepare commit data for analysis
  const commitSummary = commits
    .map((c, i) => `${i + 1}. [${c.repo}] ${c.message}`)
    .join('\n')

  // Build context guidance
  const contextGuidance = buildContextGuidance(config.ai.context, runtimeContext)

  const prompt = config.ai.codeAnalysis?.prompt || DEFAULT_CODE_ANALYSIS_PROMPT
  const fullPrompt = `${prompt}${contextGuidance}\n\n=== COMMIT DATA ===\n${commitSummary}\n\n=== END COMMIT DATA ===\n\nProvide your analysis:`

  try {
    const analysis = await runClaudeCLI(fullPrompt, verbose)

    if (verbose) {
      console.log('✅ Code analysis complete')
      console.log('Analysis preview:', analysis.substring(0, 200) + '...')
    }

    return analysis
  } catch (error) {
    console.error('❌ Code analysis failed:', error)
    return ''
  }
}

/**
 * Stage 2: Generate invoice line items from analysis
 */
export async function generateLineItems(
  codeAnalysis: string,
  totalHours: number,
  config: InvoiceConfig,
  runtimeContext?: string,
  interactive?: boolean,
  verbose?: boolean
): Promise<string> {
  if (!config.ai?.enabled || !config.ai?.lineItemGeneration?.enabled) {
    return ''
  }

  if (verbose) {
    const mode = interactive ? 'candidate options' : 'line items'
    console.log(`\n🤖 AI Stage 2: Generating ${mode} for ${totalHours} hours...`)
  }

  // Build context guidance
  const contextGuidance = buildContextGuidance(config.ai.context, runtimeContext)

  // Use different prompt for interactive mode to generate more candidates
  const basePrompt = interactive
    ? (config.ai.lineItemGeneration?.prompt || INTERACTIVE_LINE_ITEM_PROMPT)
    : (config.ai.lineItemGeneration?.prompt || DEFAULT_LINE_ITEM_PROMPT)

  const fullPrompt = `${basePrompt}${contextGuidance}\n\n=== CODE ANALYSIS ===\n${codeAnalysis}\n\n=== END CODE ANALYSIS ===\n\nTarget hours: ${totalHours}\n\nGenerate ${interactive ? '15-20 diverse line item candidates' : 'invoice line items'}:`

  try {
    const lineItems = await runClaudeCLI(fullPrompt, verbose)

    if (verbose) {
      console.log('✅ Line items generated')
      console.log('Line items preview:', lineItems.substring(0, 200) + '...')
    }

    return lineItems
  } catch (error) {
    console.error('❌ Line item generation failed:', error)
    return ''
  }
}

/**
 * Build context guidance from config and runtime context
 */
function buildContextGuidance(configContext?: string, runtimeContext?: string): string {
  const contexts: string[] = []

  if (configContext) {
    contexts.push(configContext)
  }

  if (runtimeContext) {
    contexts.push(runtimeContext)
  }

  if (contexts.length === 0) {
    return ''
  }

  return `\n\n=== CRITICAL CONTEXT REQUIREMENTS ===\nYou MUST focus your analysis and hour allocation PRIMARILY on the following specific areas:
${contexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')}

IMPORTANT INSTRUCTIONS:
- Identify commits and work related to these specific areas FIRST
- Allocate the MAJORITY of hours to these focus areas
- Other work should receive minimal hours or be grouped as "General development"
- Be specific about the features/branches mentioned in the context
- Match the technical terminology and feature names from the context
=== END CONTEXT REQUIREMENTS ===`
}

/**
 * Full AI analysis pipeline
 */
export async function runAIAnalysis(
  commits: CommitData[],
  totalHours: number,
  config: InvoiceConfig,
  runtimeContext?: string,
  interactive?: boolean,
  verbose?: boolean
): Promise<AIAnalysisResult> {
  const result: AIAnalysisResult = {}

  if (!config.ai?.enabled) {
    return result
  }

  // Stage 1: Analyze code changes
  if (config.ai.codeAnalysis?.enabled) {
    result.codeAnalysis = await analyzeCodeChanges(commits, config, runtimeContext, verbose)
  }

  // Stage 2: Generate line items (more candidates if interactive)
  if (config.ai.lineItemGeneration?.enabled && result.codeAnalysis) {
    result.lineItems = await generateLineItems(result.codeAnalysis, totalHours, config, runtimeContext, interactive, verbose)
  }

  return result
}
