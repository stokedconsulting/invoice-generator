# Invoice Generator Quick Reference

## 📋 Common Commands

```bash
# List available invoice configurations
invoice-gen
invoice-gen --list

# Generate invoice (display only - NO EMAIL SENT)
invoice-gen <config-id>

# Generate with custom week range (changes invoice period)
invoice-gen <config-id> --weeks 4

# Generate with extended commit scope (more line item options, same invoice period)
invoice-gen <config-id> --scope 3

# Generate with context focus
invoice-gen <config-id> --context "Focus on patient transfer dashboard"

# Generate with verbose output (see AI analysis and commit breakdown)
invoice-gen <config-id> --verbose

# Combine options
invoice-gen <config-id> --weeks 2 --scope 3 --context "Focus on proxy" --verbose

# Interactive mode - choose from AI-generated line item options
invoice-gen <config-id> --interactive

# Send to test email only
invoice-gen <config-id> --test

# Send to customers (with confirmation)
invoice-gen <config-id> --send

# Send previously generated invoice
invoice-gen <config-id> --send-existing
```

## 🎯 Context Usage

### CLI Context (One-Time)
```bash
invoice-gen client-id --context "Focus on authentication features"
```

### Config Context (Persistent)
Edit `~/.invoice-generator/config.json`:
```json
{
  "ai": {
    "enabled": true,
    "context": "Focus on patient transfer dashboard and fax system",
    "codeAnalysis": { "enabled": true },
    "lineItemGeneration": { "enabled": true }
  }
}
```

### Combined Context
Config provides permanent focus, CLI adds specific emphasis for this invoice.

## 💡 Context Examples

```bash
# Feature-focused
--context "Focus on authentication and security enhancements"

# Domain-focused
--context "Focus on healthcare compliance and HIPAA-related work"

# Performance-focused
--context "Focus on performance optimizations and database improvements"

# Area-focused
--context "Focus on dashboard and reporting features"

# Multi-focus
--context "Focus on: 1) API endpoints, 2) Mobile design, 3) Error handling"
```

## 🔍 Scope vs Weeks

**Understanding the Difference**:

- **`--weeks`**: Changes the invoice period itself
  - Example: `--weeks 4` creates a 4-week invoice (4 weeks of billing)

- **`--scope`**: Expands commit collection window while keeping invoice period the same
  - Example: `--scope 3` with 2-week invoice collects 3 weeks of commits to provide more line item options
  - Invoice still covers 2 weeks, but AI has more commits to choose from

**Use Cases**:

```bash
# Standard 2-week invoice with 2 weeks of commits
invoice-gen client-id

# 2-week invoice with 3 weeks of commits (1 extra week for more options)
invoice-gen client-id --scope 3

# 4-week invoice with 4 weeks of commits
invoice-gen client-id --weeks 4

# 2-week invoice with 4 weeks of commits (2 extra weeks for more options)
invoice-gen client-id --weeks 2 --scope 4

# 3-week invoice with 5 weeks of commits
invoice-gen client-id --weeks 3 --scope 5
```

**Why Use Scope?**:
- Get more diverse line item options from recent work history
- Include commits from just before invoice period that are relevant
- Better context for AI when generating professional descriptions
- Most recent commits are prioritized regardless of push status

## 📁 Important Locations

| Location | Purpose |
|----------|---------|
| `~/.invoice-generator/config.json` | Invoice configurations |
| `~/.invoice-generator/.invoices/` | Saved invoices |
| `/opt/dev/invoice-generator/` | Source code |

## 🔧 Configuration Structure

```json
{
  "version": "1.0.0",
  "global": {
    "defaultFromEmail": "you@example.com",
    "defaultBcc": ["you@example.com"]
  },
  "invoices": [
    {
      "id": "client-biweekly",
      "name": "Client Bi-Weekly Invoice",
      "customer": "ClientName",
      "enabled": true,
      "schedule": {
        "type": "bi-weekly-sunday",
        "startDate": "2024-09-15"
      },
      "email": {
        "to": ["client@example.com"],
        "cc": ["manager@example.com"],
        "bcc": ["you@example.com"],
        "subject": "Invoice {{startDate}} - {{endDate}}"
      },
      "git": {
        "repos": ["owner/repo"],
        "weeks": 2,
        "hoursPerWeek": 30
      },
      "ai": {
        "enabled": true,
        "context": "Focus on X (optional)",
        "codeAnalysis": { "enabled": true },
        "lineItemGeneration": { "enabled": true }
      }
    }
  ]
}
```

## 🚀 Workflow Examples

### Standard Workflow
```bash
# 1. Generate invoice (safe preview)
invoice-gen client-id --verbose

# 2. Test send to yourself
invoice-gen client-id --test

# 3. Send to customers
invoice-gen client-id --send
```

### Context-Driven Workflow
```bash
# 1. Generate with specific focus
invoice-gen client-id --context "Focus on new dashboard features" --verbose

# 2. Review and test
invoice-gen client-id --test

# 3. Send to customers
invoice-gen client-id --send
```

### Multi-Version Workflow
```bash
# 1. Generate multiple versions with different contexts
invoice-gen client-id --context "Focus on dashboard"
invoice-gen client-id --context "Focus on API work"
invoice-gen client-id --context "Focus on bug fixes"

# 2. Review all versions and pick the best one
invoice-gen client-id --send-existing

# 3. Interactive menu lets you select and send
```

## 🔍 Troubleshooting

### No commits found
- Verify GitHub repos or local paths are correct in config
- Check date range covers the period with commits
- Run with `--verbose` to see detailed output

### Context not affecting invoice
- Ensure AI is enabled in config
- Use `--verbose` to verify context is in prompts
- Try more specific context directives

### Email not sending
- Check `.env` file has `GMAIL_USER` and `GMAIL_APP_PASSWORD`
- Verify Gmail 2FA is enabled and app password is valid
- Check error logs for specific issues

### Build issues
```bash
cd /opt/dev/invoice-generator
npm install
npm run build
```

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [CONTEXT_USAGE.md](CONTEXT_USAGE.md) - Context feature details
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
