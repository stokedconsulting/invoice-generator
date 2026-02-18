# Feature Improvements: Commit Collection & Custom Time Ranges

## Overview

Two major improvements to invoice generation:

1. **Combined Commit Collection** - Collects from BOTH GitHub and local, prioritizes unpushed commits
2. **Custom Week Ranges** - Override default 2-week period with `--weeks` flag

---

## Feature 1: Combined Commit Collection with Local-Only Prioritization

### Problem Solved
**Before**: System used "fallback" logic - tried GitHub first, ONLY used local if GitHub returned nothing.

**Issue**: If you had unpushed local commits AND pushed GitHub commits, the local-only work was NEVER included in invoices.

### New Behavior
**After**: System ALWAYS collects from BOTH sources, then:
1. Deduplicates by commit hash
2. Identifies local-only (unpushed) commits
3. Prioritizes local-only commits FIRST in the analysis

### How It Works

```typescript
// Step 1: Collect from GitHub
const githubCommits = await getGitHubCommitsForRepo(...)

// Step 2: ALWAYS collect from local (not a fallback anymore)
const localCommits = await getLocalCommits(...)

// Step 3: Deduplicate and prioritize
const githubHashes = new Set(githubCommits.map(c => c.hash))
const localOnlyCommits = localCommits.filter(c => !githubHashes.has(c.hash))
const commonCommits = localCommits.filter(c => githubHashes.has(c.hash))

// Step 4: Combine with local-only commits FIRST (prioritized)
const allCommits = [...localOnlyCommits, ...commonCommits]
```

### Verbose Output

When running with `--verbose`, you'll see:

```
Fetching commits from GitHub repos: owner/repo
  Found 25 GitHub commits in repo

Fetching commits from 3 local directories:
  - /opt/dev/xferall-main
  - /opt/dev/xferall-latest
  Found 30 local commits in xferall-main
  Found 15 local commits in xferall-latest

📊 Commit breakdown:
  Local-only (unpushed): 8
  Pushed to GitHub: 25
  Total unique: 33
```

### Benefits

✅ **Captures all work** - Both pushed and unpushed commits
✅ **Prioritizes recent work** - Local-only commits analyzed first by AI
✅ **Accurate billing** - No missing work from local development
✅ **Better context** - AI sees unpushed work that's often most recent/relevant

### Example Scenario

**Your workflow:**
- Monday-Wednesday: Work on feature/devWorkflow branch (10 commits, not pushed)
- Thursday-Friday: Push feature/devWorkflow, work on main (5 commits pushed)

**Old system:** Only 5 commits from Thursday-Friday (missed Monday-Wednesday work)
**New system:** All 15 commits, with Monday-Wednesday work prioritized

---

## Feature 2: Custom Week Ranges

### Problem Solved
**Before**: Fixed 2-week period from config, no way to override for specific invoices.

**Issue**: Sometimes you need 1 week, 3 weeks, or 4 weeks depending on billing cycle or work done.

### New Behavior
**After**: Use `--weeks` flag to override config default for any invoice generation.

### Usage

```bash
# Use config default (2 weeks)
invoice-gen xferall-biweekly

# Override to 1 week
invoice-gen xferall-biweekly --weeks 1

# Override to 4 weeks
invoice-gen xferall-biweekly --weeks 4

# Combine with other flags
invoice-gen xferall-biweekly --weeks 3 --context "Focus on proxy work" --verbose
```

### Config Integration

```json
{
  "id": "client-biweekly",
  "git": {
    "repos": ["owner/repo"],
    "weeks": 2,              // ← Default
    "hoursPerWeek": 30
  }
}
```

**Runtime override:**
```bash
invoice-gen client-biweekly --weeks 4  # Uses 4 weeks instead of config's 2
```

### Output Indication

When using `--weeks`, the system shows:

```
🚀 Generating invoice: Xferall Bi-Weekly Invoice
   Customer: Xferall
   Schedule: bi-weekly-sunday
   Weeks: 4 (overriding config default)  ← Shows override
   Context: Focus on proxy work
```

### Use Cases

| Scenario | Command | Result |
|----------|---------|--------|
| Monthly invoice | `--weeks 4` | 4 weeks analyzed |
| Quick weekly | `--weeks 1` | 1 week analyzed |
| Catch-up invoice | `--weeks 6` | 6 weeks analyzed |
| Standard bi-weekly | (no flag) | Uses config default |

---

## Combined Usage Example

```bash
# Generate 3-week invoice with context, prioritizing local commits
invoice-gen xferall-biweekly \
  --weeks 3 \
  --context "Focus on feature/devWorkflow and proxy setup" \
  --verbose \
  --test

# Output shows:
# - GitHub commits: 45
# - Local-only (unpushed): 12
# - Total unique: 57
# - Invoice covers Oct 26 - Nov 15 (3 weeks)
# - Line items focus on devWorkflow and proxy
# - Local-only work prioritized in analysis
```

---

## Technical Details

### Files Modified

1. **src/cli.ts**
   - Added `--weeks <number>` flag (line 89)
   - Display weeks override in output (line 255-257)
   - Pass `weeksOverride` to generator (line 267)

2. **src/invoice-generator.ts**
   - Added `weeksOverride` to options interface (line 27)
   - Use override or config default (line 156)
   - Changed to combined collection strategy (line 257-347)
   - Added commit hash tracking for deduplication
   - Verbose breakdown of commit sources (line 335-340)

3. **src/invoice-generator.ts - getGitHubCommitsForRepo()**
   - Added hash field to return type (line 379)
   - Include SHA in GitHub API query (line 388)
   - Return hash with each commit (line 405)

### Deduplication Logic

Commits are deduplicated by **commit hash (SHA)**:
- GitHub API returns `.sha` field
- Local git returns `.hash` field
- Same commit in both sources = same hash
- Filter local commits by checking if hash exists in GitHub set

### Performance Impact

**Combined Collection:**
- Slightly slower (fetches from both sources)
- More accurate (captures all commits)
- Network + disk I/O in parallel

**Custom Weeks:**
- No performance impact
- More flexible billing periods
- Same AI analysis cost per week

---

## Testing

### Test Local-Only Prioritization

1. Make local commits without pushing:
   ```bash
   cd /opt/dev/xferall-main
   git commit -m "Local work 1"
   git commit -m "Local work 2"
   # Don't push
   ```

2. Generate invoice with verbose:
   ```bash
   invoice-gen xferall-biweekly --verbose
   ```

3. Verify output shows:
   - "Local-only (unpushed): 2"
   - AI analysis mentions "Local work 1" and "Local work 2"

### Test Custom Weeks

```bash
# Test 1 week
invoice-gen xferall-biweekly --weeks 1

# Test 4 weeks
invoice-gen xferall-biweekly --weeks 4

# Verify date ranges match requested weeks
```

---

## Backward Compatibility

✅ **Fully backward compatible:**
- Configs without `repoDirs` still work (GitHub-only)
- Configs without GitHub repos still work (local-only)
- Invoices without `--weeks` use config default
- No config changes required

---

## Troubleshooting

### No local-only commits shown
- Verify `repoDirs` is configured in invoice config
- Check local repos have unpushed commits: `git log origin/main..HEAD`
- Use `--verbose` to see commit collection process

### Weeks override not working
- Ensure using correct syntax: `--weeks 4` (not `--week`)
- Verify number is valid (positive integer)
- Check output for "overriding config default" message

### Duplicate commits in invoice
- Should not happen due to hash deduplication
- If occurs, report as bug with `--verbose` output
- Possible cause: local and GitHub repos out of sync

---

## Related Documentation

- [README.md](README.md) - Full system documentation
- [CONTEXT_USAGE.md](CONTEXT_USAGE.md) - Context feature guide
- [BUGFIX_CONTEXT.md](BUGFIX_CONTEXT.md) - Recent bug fixes
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
