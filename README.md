# Invoice Generator

✨ **[Meet the Invoice Fairy!](https://brian-stoker.github.io/invoice-generator/)** ✨

Automated invoice generation system that analyzes **GitHub repository commits** to create accurate, deliverable-focused invoices.

## Key Advantages

**Why GitHub-First?** This tool fetches commits directly from GitHub repositories, giving you invoices based on what was actually delivered to your clients - not just what's on your local machine. This provides:
- 🎯 Accurate billing based on pushed/merged code
- 📈 Client-visible work history
- 🔍 Transparent, auditable invoicing

## Features

- 🚀 **GitHub-First**: Fetches commits directly from GitHub repos (what was actually delivered)
- 🤖 **AI-Powered Analysis**: Uses Claude to generate specific, detailed invoice line items instead of generic categories
- 💾 **Invoice Storage**: All invoices automatically saved - generate multiple versions, pick the best one to send
- 📊 Smart fallback to local repositories when needed
- 📧 Sends formatted HTML emails via Gmail
- 🗓️ Flexible scheduling (bi-weekly, weekly, monthly, custom)
- 👥 Multi-client support with configuration files
- 🛡️ **Safe by default**: Preview mode (display-only, no sending) unless explicitly told to send
- 📝 Automatically categorizes work based on commit messages
- ⏰ Configurable hours per week per client
- 🔧 Easy to add new clients without code changes
- 🌐 Works from anywhere on your machine with `invoice-gen` command

## Installation

1. Clone the repository:
```bash
git clone https://github.com/brian-stoker/invoice-generator.git
cd invoice-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up Gmail credentials:
```bash
cp .env.template .env
# Edit .env with your Gmail app password
```

4. Build the TypeScript files:
```bash
npm run build
```

5. Set up Invoice Fairy directory:
```bash
./setup-invoice-generator.sh
```

This creates `~/.invoice-generator/` with:
- `config.json` - Your invoice configurations
- `.invoices/` - Saved invoices directory

**All instances (global, dev, scheduler) use this shared config location.**

6. Install globally (optional):
```bash
npm install -g .
```

## Configuration

The system uses `~/.invoice-generator/config.json` to manage multiple invoice configurations. This shared location ensures all instances (global, dev, scheduler) use the same config.

### Configuration File Format

```json
{
  "version": "1.0.0",
  "global": {
    "defaultFromEmail": "your@email.com",
    "defaultBcc": ["your@email.com"]
  },
  "invoices": [
    {
      "id": "client-biweekly",
      "name": "Client Name Bi-Weekly Invoice",
      "customer": "ClientName",
      "enabled": true,
      "schedule": {
        "type": "bi-weekly-sunday",
        "startDate": "2024-09-15"
      },
      "email": {
        "to": ["client@example.com"],
        "cc": ["manager@example.com"],
        "bcc": ["your@email.com"],
        "subject": "Invoice from {{startDate}} - {{endDate}}",
        "fromName": "Your Name"
      },
      "git": {
        "repos": ["owner/repo"],              // GitHub repos (primary source)
        "repoDirs": ["/path/to/local/*"],     // Local dirs (fallback)
        "weeks": 2,
        "hoursPerWeek": 30
      },
      "ai": {
        "enabled": true,                      // Enable AI-powered analysis
        "codeAnalysis": {
          "enabled": true                     // Stage 1: Analyze code changes
        },
        "lineItemGeneration": {
          "enabled": true                     // Stage 2: Generate line items
        }
      }
    }
  ]
}
```

### Schedule Types

- **bi-weekly-sunday**: Every other Sunday (requires `startDate`)
- **weekly-sunday**: Every Sunday
- **monthly-first**: First day of each month
- **monthly-last**: Last day of each month
- **custom**: Custom cron expression (coming soon)

### AI-Powered Analysis (Optional)

Enable AI-powered invoice generation for specific, detailed line items instead of generic categories:

```json
"ai": {
  "enabled": true,
  "context": "Focus on patient transfer dashboard and fax system (optional)",
  "codeAnalysis": {
    "enabled": true,
    "prompt": "Custom prompt for code analysis (optional)"
  },
  "lineItemGeneration": {
    "enabled": true,
    "prompt": "Custom prompt for line item generation (optional)"
  }
}
```

**How it works:**

1. **Stage 1 - Code Analysis**: Claude analyzes all git commits to understand what was actually built, fixed, or improved
2. **Stage 2 - Line Item Generation**: Claude converts the technical analysis into professional, client-friendly invoice line items with hour estimates

**Example output without AI:**
- Bug fixes and error resolution
- New feature development
- Code refactoring and optimization

**Example output with AI:**
- Transfer Center performance optimization and feature enhancements including lazy-loading implementation and attachment viewing capabilities (9hr)
- Development of level of care filtering system with selectable options for inbound transfer management (6hr)
- Design and implementation of database-driven release notes management system with active status controls (4hr)

**Requirements:**
- `claude` CLI must be installed and available in your PATH
- Claude Code authentication must be set up

**Custom Prompts:**
You can customize the prompts for each stage to fit your business needs. See the default prompts in `src/ai-analyzer.ts` for examples.

**Context-Driven Invoicing:**
Guide the AI to focus on specific work areas using optional context:
- **Config-level**: Add `"context": "Focus on X"` to the `ai` section for permanent focus
- **Runtime**: Use `--context "Focus on X"` flag for one-time emphasis
- **Combined**: Both config and runtime contexts are used together for comprehensive guidance

See [CONTEXT_USAGE.md](CONTEXT_USAGE.md) for detailed examples and best practices.

### Git Configuration

The `git` section supports two types of sources:

**Primary: GitHub Repositories (`repos`)**
- Format: `"owner/repo"` (e.g., `"xferall/xferinpatient"`)
- Fetches commits via GitHub API using `gh` CLI
- Shows what was actually pushed/delivered to client
- Multiple repos supported: `["owner/repo1", "owner/repo2"]`

**Fallback: Local Directories (`repoDirs`)**
- Glob patterns supported: `"/opt/dev/xferall*"`
- Only used if GitHub fetch returns no commits
- Useful for offline work or historical data

**Example:**
```json
"git": {
  "repos": ["xferall/xferinpatient"],      // ← Try GitHub first
  "repoDirs": ["/opt/dev/xferall*"],       // ← Fallback to local
  "weeks": 2,
  "hoursPerWeek": 30
}
```

## Usage

The `invoice-gen` command works from anywhere on your system.

### List Available Configurations

```bash
invoice-gen
# or
invoice-gen --list
```

### Generate Invoice (Default: Display Only)

```bash
# Preview invoice (NO EMAIL SENT - safe by default)
invoice-gen xferall-biweekly

# With verbose output to see GitHub API calls and AI analysis
invoice-gen xferall-biweekly --verbose

# With context to focus on specific work areas
invoice-gen xferall-biweekly --context "Focus on patient transfer dashboard features"

# With custom time range (override config default - changes invoice period)
invoice-gen xferall-biweekly --weeks 4

# With extended commit scope (more commit history for line item options, same invoice period)
invoice-gen xferall-biweekly --scope 3

# Combine multiple options
invoice-gen xferall-biweekly --weeks 2 --scope 3 --context "Focus on proxy work" --verbose

# Interactive mode - choose your line items
invoice-gen xferall-biweekly --interactive
```

**Note:** All generated invoices are automatically saved to `~/.invoice-generator/.invoices/` directory for later sending.

### Send Invoice (Test Mode)

```bash
# Send ONLY to your test email (b@stokedconsulting.com)
invoice-gen xferall-biweekly --test
```

### Send Invoice (Production with Confirmation)

```bash
# Prompts for confirmation before sending to customers
invoice-gen xferall-biweekly --send
```

### Send a Previously Generated Invoice

Generate multiple invoices, refine them with AI, then pick the best one to send:

```bash
# List and send a previously generated invoice
invoice-gen xferall-biweekly --send-existing

# Interactive prompts:
# 1. Select invoice from list (shows date range and generation time)
# 2. Preview the invoice text
# 3. Choose: Send to test email, Send to customers, or Cancel
```

**Workflow example:**
```bash
# Generate invoice #1
invoice-gen xferall-biweekly

# Generate invoice #2 with different data
invoice-gen xferall-biweekly

# Review both and send the better one
invoice-gen xferall-biweekly --send-existing
```

All sent invoices are marked with `[SENT]` label and include timestamp.

## Automated Scheduling

### Set Up Scheduler

The scheduler automatically runs all enabled invoices based on their schedules:

```bash
./setup-scheduler.sh
```

This creates a launchd job that runs every Sunday at 9:00 AM and checks which invoices should run that day.

### Manage Scheduler

```bash
# Check status
launchctl list | grep invoice

# Stop scheduler
launchctl unload ~/Library/LaunchAgents/com.stokedconsulting.invoice-generator.plist

# Start scheduler
launchctl load ~/Library/LaunchAgents/com.stokedconsulting.invoice-generator.plist

# View logs
tail -f scheduler.log
```

## Adding a New Client

1. Edit `invoice-configs.json`
2. Add a new invoice configuration:

```json
{
  "id": "newclient-monthly",
  "name": "New Client Monthly Invoice",
  "customer": "NewClient",
  "enabled": true,
  "schedule": {
    "type": "monthly-first"
  },
  "email": {
    "to": ["client@newclient.com"],
    "subject": "Monthly Invoice {{startDate}} - {{endDate}}"
  },
  "git": {
    "repos": ["/opt/dev/newclient*"],
    "weeks": 4,
    "hoursPerWeek": 40
  }
}
```

3. Test it:
```bash
invoice newclient-monthly --test --dry-run
```

4. Enable when ready - it will automatically run on schedule!

## Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an app password:
   - Go to https://myaccount.google.com/security
   - Click on "2-Step Verification"
   - Click on "App passwords"
   - Generate a new password for "Mail"
3. Add the password to `.env` file:
```
GMAIL_USER=your@email.com
GMAIL_APP_PASSWORD=your-app-password-here
```

## Invoice Format

The invoice includes:
- Week-by-week breakdown
- Task categorization based on commit analysis
- Configurable hours per week
- HTML formatted email with professional styling

## Commit Analysis

The system categorizes commits into:
- Bug fixes and error resolution
- New feature development
- Code refactoring and optimization
- Testing and quality assurance
- Documentation updates
- UI/UX improvements
- Database and data management
- API development
- Deployment and DevOps
- Domain-specific categories (fax, dashboard, etc.)
- General development and maintenance

Hours are distributed proportionally based on commit activity in each category.

## Troubleshooting

### Email not sending
- Check `.env` file has correct Gmail app password
- Verify 2-factor authentication is enabled
- Check `scheduler-error.log` for errors

### Scheduler not running
- Verify launchd job is loaded: `launchctl list | grep invoice`
- Check logs in `scheduler.log` and `scheduler-error.log`
- Ensure Node.js path is correct in plist file

### No commits found
- Verify git repositories exist at configured paths
- Check glob patterns in config match your repos
- Run with `--verbose` flag for detailed output

### Config not found
- Verify `invoice-configs.json` exists in project root
- Check JSON is valid (no trailing commas, proper quotes)
- Ensure config ID matches exactly (case-sensitive)

## Development

### Project Structure

```
invoice-generator/
├── src/
│   ├── types/
│   │   └── config.ts          # Configuration type definitions
│   ├── cli.ts                 # Command-line interface
│   ├── scheduler.ts           # Automated scheduler
│   ├── config-loader.ts       # Configuration management
│   ├── invoice-generator.ts   # Invoice generation logic
│   ├── invoice-storage.ts     # Invoice saving/loading
│   ├── ai-analyzer.ts         # AI-powered analysis
│   └── email-sender.ts        # Email sending logic
├── setup-invoice-generator.sh  # Setup script for ~/.invoice-generator/
├── .env                       # Gmail credentials (not in git)
└── package.json

~/.invoice-generator/          # User config directory (not in repo)
├── config.json                # Your invoice configurations
└── .invoices/                 # Saved invoices
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test invoice generation
npm run test

# Test specific config
invoice your-config-id --test --dry-run --verbose
```

## Contributing

We welcome contributions from everyone! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Quick Start

1. **Report a bug** or **suggest a feature**: [Open an issue](https://github.com/brian-stoker/invoice-generator/issues/new/choose)
2. **Submit a PR**: Fork, make changes, submit a pull request
3. **Ask questions**: Open an issue with the `question` label

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Areas We'd Love Help With

- 🎨 CLI output improvements
- 📊 Better commit categorization
- 🔧 Custom schedule types
- 🌍 Internationalization
- 📝 Documentation
- 🧪 Testing
- 🐛 Bug fixes

All contributors are recognized in commit history and releases!

## Code of Conduct

We're committed to providing a welcoming and inclusive environment. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Credits

**Product Manager**: Brian Stoker
**Developer**: Claude (Anthropic AI Assistant)

## License

MIT
