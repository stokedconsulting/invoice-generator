# Interactive Invoice Generation Mode

## Overview

Interactive mode gives you **complete control** over which line items appear in your invoice by letting you choose from a large pool of AI-generated options.

## How It Works

### Standard Mode (Default)
```bash
invoice-gen xferall-biweekly
```
- AI generates 5-8 line items that total the target hours
- Automatically included in invoice
- No user interaction

### Interactive Mode
```bash
invoice-gen xferall-biweekly --interactive
```
- AI generates 15-20 diverse line item candidates
- You choose which ones to include via checkbox interface
- Hours automatically adjusted to match target
- Full control over invoice content

---

## Step-by-Step Workflow

### 1. AI Generation Phase
```
🤖 AI Stage 1: Analyzing 45 commits...
✅ Code analysis complete

🤖 AI Stage 2: Generating candidate options for 30 hours...
✅ Line items generated
```

### 2. Interactive Selection (Per Week)
```
📋 October 26 - November 1, 2025 - Select line items (target: 30hrs)

? Select line items for October 26 - November 1, 2025: (Press <space> to select)
❯◯ [8hr] DevWorkflow feature implementation with state management
 ◯ [6hr] Proxy setup improvements including configuration updates
 ◯ [5hr] RedshiftDiffy branch development and testing
 ◯ [4hr] Enhanced fax system with real-time processing
 ◯ [3hr] Authentication and security improvements
 ◯ [4hr] Database query optimization and indexing
 ◯ [5hr] UI/UX improvements for admin interface
 ◯ [3hr] Code refactoring and technical debt reduction
 ◯ [7hr] Comprehensive proxy and routing enhancements
 ◯ [4hr] Error handling and logging improvements
 ◯ [2hr] Dependency updates and compatibility fixes
 ◯ [6hr] API endpoint development and testing
 ◯ [5hr] Frontend state management improvements
 ◯ [3hr] Documentation and code comments
 ◯ [4hr] Testing and quality assurance
```

Use arrow keys to navigate, **spacebar to select**, Enter to confirm.

### 3. Hour Adjustment
```
✅ Selected 4 items (28hrs)

? Selected total is 28hrs, 2hrs under target. Adjust to 30hrs? (Y/n)
```

If you choose Yes:
- Hours are adjusted proportionally across selected items
- Final total matches target exactly

If you choose No:
- Uses your selected hours as-is
- May not match target exactly

### 4. Summary Display
```
📊 Selection Summary

October 26 - November 1, 2025 - 30hrs
  8hr - DevWorkflow feature implementation with state management
  7hr - Proxy setup improvements including configuration updates
  8hr - RedshiftDiffy branch development and testing
  7hr - Enhanced fax system with real-time processing

November 2 - November 8, 2025 - 30hrs
  10hr - Proxy refinements and performance optimization
  9hr - RedshiftDiffy feature completion and integration
  6hr - DevWorkflow bug fixes and improvements
  5hr - Database optimization and caching
```

---

## Usage Examples

### Basic Interactive Mode
```bash
invoice-gen xferall-biweekly --interactive
```

### With Context Focus
```bash
invoice-gen xferall-biweekly \
  --interactive \
  --context "Focus on devWorkflow, proxy, and redshiftDiffy branches"
```

### With Custom Weeks
```bash
invoice-gen xferall-biweekly \
  --interactive \
  --weeks 4 \
  --context "Focus on major features"
```

### With Verbose Output
```bash
invoice-gen xferall-biweekly \
  --interactive \
  --verbose
```
Shows AI prompts and commit breakdown in addition to interactive selection.

---

## Benefits

### ✅ **Complete Control**
- Choose exactly what appears in your invoice
- Remove items that don't fit the narrative
- Emphasize important work

### ✅ **More Options**
- 15-20 candidates vs 5-8 in standard mode
- Different granularities (broad vs specific)
- Alternative groupings of the same work

### ✅ **Flexible Hour Allocation**
- Adjust emphasis on different areas
- Match client expectations
- Control billing narrative

### ✅ **Quality Assurance**
- Review all options before finalizing
- Ensure accuracy and appropriateness
- Customize for each client's style

---

## Selection Strategies

### Strategy 1: Feature-Focused
**Goal**: Emphasize major features delivered

**Selection**:
- ✅ Large feature items (8-10hr)
- ✅ Specific implementation details
- ❌ Small bug fixes
- ❌ General maintenance

**Result**: Invoice focuses on significant deliverables

### Strategy 2: Comprehensive Coverage
**Goal**: Show breadth of work across all areas

**Selection**:
- ✅ Mix of features, bugs, infrastructure
- ✅ Variety of 3-6hr items
- ❌ Very large or very small items

**Result**: Balanced invoice showing diverse contributions

### Strategy 3: Client-Specific Emphasis
**Goal**: Match what client cares about most

**Example for healthcare client**:
- ✅ Compliance and security items
- ✅ HIPAA-related work
- ✅ Patient data handling
- ❌ Generic infrastructure unless business-critical

**Result**: Invoice speaks to client's priorities

### Strategy 4: High-Level Summary
**Goal**: Executive-friendly invoice with minimal detail

**Selection**:
- ✅ Broad 10-15hr items
- ✅ Business-outcome focused
- ❌ Technical implementation details

**Result**: Clean, high-level invoice for non-technical stakeholders

---

## AI Candidate Generation

### How AI Creates Candidates

**Standard Mode** (5-8 items):
- Groups work to match target hours exactly
- Focuses on major themes
- Optimized for efficiency

**Interactive Mode** (15-20 items):
- Intentionally generates MORE than needed
- Varies granularity: 2hr to 10hr items
- Multiple ways to group the same work
- Total across all candidates > target hours

### Example Variety

**Same work, different groupings**:

**Specific items**:
- 4hr - DevWorkflow state management implementation
- 3hr - DevWorkflow route configuration
- 2hr - DevWorkflow testing and validation

**OR broad item**:
- 9hr - DevWorkflow feature implementation

**User chooses which style** fits better for this invoice!

---

## Tips & Best Practices

### Selection Tips

1. **Read all options first** before selecting
2. **Look for overlapping items** - avoid selecting duplicates
3. **Mix granularities** for natural-looking invoices
4. **Aim slightly under target** - easier to adjust up than down
5. **Use spacebar** to select, not Enter (Enter confirms)

### Time-Saving Shortcuts

- **Arrow keys**: Navigate quickly
- **Spacebar**: Toggle selection
- **Ctrl+A**: Select all (if supported by terminal)
- **Ctrl+C**: Cancel and restart

### Common Patterns

**Week with major feature**:
- 1-2 large items (10-12hr) for the main feature
- 2-3 smaller items (3-5hr) for supporting work

**Week with diverse work**:
- 4-6 medium items (4-6hr each)
- Shows variety without overwhelming detail

**Catch-up week with less work**:
- Select fewer items
- Don't adjust to target if not appropriate
- Honest billing builds trust

---

## Troubleshooting

### No Options Appear
**Cause**: AI generation failed or no commits found
**Solution**:
- Check `--verbose` output for errors
- Verify AI is enabled in config
- Ensure commits exist in date range

### Too Many Similar Options
**Cause**: AI generated variants of same work
**Solution**:
- Choose the grouping that fits best
- Avoid selecting multiple items describing same work

### Can't Reach Target Hours
**Cause**: Selected items total less than target
**Solution**:
- Select more items
- Choose larger granularity options
- Accept hour adjustment prompt

### Hours Don't Feel Right
**Cause**: Proportional adjustment spread hours unnaturally
**Solution**:
- Decline adjustment prompt
- Manually verify line item hours make sense
- Regenerate invoice with different context if needed

---

## Comparison

| Aspect | Standard Mode | Interactive Mode |
|--------|---------------|------------------|
| **Control** | Auto-generated | Full user control |
| **Options** | 5-8 items | 15-20 candidates |
| **Time** | Fast (~30 sec) | Slower (~2-3 min) |
| **Customization** | Limited | Extensive |
| **Best For** | Quick invoices | Important clients, custom needs |

---

## Advanced Usage

### Combining with Other Features

```bash
# Maximum customization
invoice-gen xferall-biweekly \
  --interactive \
  --weeks 3 \
  --context "Focus on Q4 deliverables: devWorkflow, proxy upgrades, redshiftDiffy" \
  --verbose

# Test mode for practice
invoice-gen xferall-biweekly \
  --interactive \
  --test

# Review then send
invoice-gen xferall-biweekly --interactive   # Review and refine
invoice-gen xferall-biweekly --send-existing # Send the one you just created
```

### Workflow Integration

**Multi-version approach**:
```bash
# Generate 3 versions with different selections
invoice-gen xferall-biweekly --interactive  # Pick feature-focused items
invoice-gen xferall-biweekly --interactive  # Pick comprehensive items
invoice-gen xferall-biweekly --interactive  # Pick client-priority items

# Review all 3
invoice-gen xferall-biweekly --send-existing  # Pick best one to send
```

---

## Technical Details

### Files Involved
- **src/interactive-selector.ts** - Interactive selection UI
- **src/ai-analyzer.ts** - Dual prompt system (standard vs interactive)
- **src/invoice-generator.ts** - Integration with invoice workflow
- **src/cli.ts** - `--interactive` flag handling

### Prompt Differences

**Standard prompt**:
- "Total hours must match the specified amount"
- Generates optimized set of items

**Interactive prompt**:
- "Generate 15-20 diverse line item candidates"
- "Total hours across ALL candidates will exceed target"
- "Vary the granularity"
- "Include different groupings"

### Selection Algorithm

1. User selects items via checkbox
2. Calculate total of selected items
3. If total ≠ target, prompt for adjustment
4. If adjust accepted, apply proportional scaling
5. Display final selections with adjusted hours

---

## Related Documentation

- [README.md](README.md) - Full system documentation
- [CONTEXT_USAGE.md](CONTEXT_USAGE.md) - Context feature guide
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [FEATURE_IMPROVEMENTS.md](FEATURE_IMPROVEMENTS.md) - Combined commits and custom weeks
