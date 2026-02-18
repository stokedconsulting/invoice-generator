# Context-Driven Invoice Generation

## Overview

The invoice generator now supports **optional context directives** to guide AI-powered invoice generation. This allows you to focus the invoice on specific activities, features, or work areas that are most relevant to your billing period.

## How It Works

Context can be provided at two levels:

### 1. **Config-Level Context** (Persistent)
Add a `context` field to the `ai` section of your invoice configuration in `~/.invoice-generator/config.json`:

```json
{
  "id": "client-biweekly",
  "name": "Client Bi-Weekly Invoice",
  "customer": "ClientName",
  "enabled": true,
  "ai": {
    "enabled": true,
    "context": "Focus on patient transfer dashboard features and fax system improvements",
    "codeAnalysis": {
      "enabled": true
    },
    "lineItemGeneration": {
      "enabled": true
    }
  },
  "git": {
    "repos": ["owner/repo"],
    "weeks": 2,
    "hoursPerWeek": 30
  }
}
```

**Use Case**: Permanent focus areas that apply to all invoices for this client.

### 2. **Runtime Context** (One-Time)
Pass context via the `--context` CLI flag:

```bash
invoice-gen client-biweekly --context "Focus on the new release notes management system"
```

**Use Case**: Specific emphasis for this invoice only, like a major feature or priority project.

### 3. **Combined Context**
Both contexts are used together when both are present:

```bash
# Config has: "Focus on patient transfer dashboard features"
# CLI adds: "Focus on the new release notes management system"
# AI receives both contexts for comprehensive guidance
invoice-gen client-biweekly --context "Focus on the new release notes management system"
```

## Context Examples

### Feature-Focused
```bash
invoice-gen client-biweekly --context "Focus on authentication and security enhancements"
```

### Domain-Focused
```bash
invoice-gen client-biweekly --context "Focus on healthcare compliance and HIPAA-related work"
```

### Performance-Focused
```bash
invoice-gen client-biweekly --context "Focus on performance optimizations and database improvements"
```

### Area-Focused
```bash
invoice-gen client-biweekly --context "Focus on dashboard and reporting features"
```

### Multi-Focus
```bash
invoice-gen client-biweekly --context "Focus on: 1) API endpoint development, 2) Mobile responsive design, 3) Error handling improvements"
```

## How Context Affects Invoice Generation

The context is injected into both AI analysis stages:

### Stage 1: Code Analysis
Claude analyzes commits with context guidance, identifying work that matches your focus areas.

### Stage 2: Line Item Generation
Claude generates invoice line items that emphasize the work you've highlighted, allocating more hours to context-relevant activities.

## Example Impact

**Without Context:**
```
12hr - Bug fixes and error resolution
10hr - New feature development
8hr - Code refactoring and optimization
```

**With Context** (`--context "Focus on patient transfer dashboard features"`):
```
15hr - Patient transfer dashboard development including status tracking and filtering capabilities
8hr - Transfer center performance optimization with lazy-loading and caching improvements
7hr - Bug fixes and error resolution across transfer workflows
```

## Best Practices

1. **Be Specific**: "Focus on patient transfer dashboard" is better than "Focus on features"
2. **List Priorities**: Use numbered lists for multiple focus areas
3. **Use Config Context for Standing Priorities**: Permanent client focus areas go in config
4. **Use CLI Context for Temporary Focus**: One-time emphasis for specific billing periods
5. **Combine Both**: Use config for general focus + CLI for this period's specific priority

## Command Reference

```bash
# List available configs
invoice-gen --list

# Generate with runtime context
invoice-gen <config-id> --context "Your focus directive here"

# Generate with verbose output to see AI analysis
invoice-gen <config-id> --context "Focus on X" --verbose

# Test invoice with context
invoice-gen <config-id> --context "Focus on X" --test

# Send invoice with context to customers
invoice-gen <config-id> --context "Focus on X" --send
```

## Configuration Example

Full example of an invoice config with context:

```json
{
  "version": "1.0.0",
  "global": {
    "defaultFromEmail": "you@example.com",
    "defaultBcc": ["you@example.com"]
  },
  "invoices": [
    {
      "id": "acme-biweekly",
      "name": "ACME Corp Bi-Weekly Invoice",
      "customer": "ACME",
      "enabled": true,
      "schedule": {
        "type": "bi-weekly-sunday",
        "startDate": "2024-09-15"
      },
      "email": {
        "to": ["billing@acme.com"],
        "subject": "Invoice {{startDate}} - {{endDate}}"
      },
      "git": {
        "repos": ["acme/product"],
        "weeks": 2,
        "hoursPerWeek": 30
      },
      "ai": {
        "enabled": true,
        "context": "Focus on e-commerce checkout flow and payment processing",
        "codeAnalysis": {
          "enabled": true
        },
        "lineItemGeneration": {
          "enabled": true
        }
      }
    }
  ]
}
```

## Requirements

- AI must be enabled in config (`ai.enabled: true`)
- Code analysis must be enabled (`ai.codeAnalysis.enabled: true`)
- Line item generation must be enabled (`ai.lineItemGeneration.enabled: true`)
- `claude` CLI must be installed and authenticated

## Troubleshooting

**Context not appearing to affect invoice:**
- Use `--verbose` flag to see AI prompts and verify context is being included
- Ensure AI is enabled in your config
- Check that you have commits during the billing period
- Try more specific context directives

**Context ignored:**
- Verify your config JSON is valid (no syntax errors)
- Rebuild after config changes: `cd /opt/dev/invoice-generator && npm run build`
- Check that both code analysis and line item generation are enabled
