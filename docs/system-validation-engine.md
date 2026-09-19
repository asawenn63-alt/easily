# System Validation Engine

Automatic quality gate for the Easily AI editing platform. Proves that major workflows execute without manual testing.

**Modules:**
- `js/system-validation-engine.js` — framework (PASS / WARNING / FAIL) + **95% library gate**
- `js/validation-harness.js` — test environment + pipeline hooks
- `js/validation-assert.js` — scenario assertion helpers
- `js/validation-scenario-library.js` — **128 user editing scenarios**
- `js/validation-scenarios.js` — merges library + 3 workflow scenarios
- `validation.html` — browser runner
- `scripts/run-validation.mjs` — Node regression CLI (Puppeteer)

---

## Product readiness gate

The **scenario library** (128 flat user utterances) must reach **≥95% success** before the product is considered ready.

- Each scenario runs in isolation via `EasilyValidationHarness.resetEnvironment()`
- **FAIL = bug** — fix reliability, do not add features
- Success rate = `(total − fail) / total`
- Reports list all failed scenario IDs in `failedScenarios`

---

## Architecture

```
validation.html  OR  scripts/run-validation.mjs
        │
        ▼
EasilySystemValidation.runAll()
        │
        ├─ Library scenarios (128)  hero / about / gallery / text / color / session / engines / persistence
        ├─ Workflow scenario 1  (full edit lifecycle)
        ├─ Workflow scenario 2  (generate + colors + sections)
        ├─ Workflow scenario 3  (premium refinement)
        └─ Engine audit  (all modules loaded + syntax)
                │
                ▼
        validation-report.json
        validation-report.txt
```

---

## Scenarios

### Scenario 1 — Full edit lifecycle
Create website → change hero image → reject/another → accept → rewrite hero text → accept → change logo → undo → redo → save → reload → verify persistence.

Verifies: Intent Resolution, Design Memory, Image Intelligence, Edit Session, Undo, Persistence, Preview, Pipeline, Orchestrator.

### Scenario 2 — Generate and restyle
Generate website (`fillSection all`) → colors → about image → gallery → CTA → reload → Design Memory.

Verifies: Text Intelligence, Design Memory, Consistency, Persistence.

### Scenario 3 — Premium refinement
Premium hero → about → gallery → services → style consistency score.

Verifies: Orchestrator, Image Intelligence diversity, Text Intelligence tone, Undo.

---

## Status levels

| Status | Meaning |
|--------|---------|
| **PASS** | Check succeeded |
| **WARNING** | Non-blocking issue (e.g. shallow undo stack, limited image pool) |
| **FAIL** | Blocking regression — exit code 1 |

---

## Running validation

### Browser (interactive)
1. Start Easily: `1-STARTA-EASILY.bat`
2. Open `http://localhost:3847/validation.html`
3. Or auto-run: `http://localhost:3847/validation.html?run=1`

### Regression CLI
```bash
# Server must be running
node scripts/run-validation.mjs
```

### Windows shortcut
```
3-VALIDERA-EASILY.bat
```

### Node-only (syntax, no browser)
```bash
node scripts/run-validation.mjs --node-only
```

### Optional: headless browser via Puppeteer
```bash
cd server && npm install puppeteer
node ../scripts/run-validation.mjs
```

---

## Reports

| File | Content |
|------|---------|
| `validation-report.json` | Machine-readable full report |
| `validation-report.txt` | Human-readable summary |

Example:

```
Intent Resolution    PASS
Image Intelligence   PASS
Undo                 PASS
Preview              WARNING
  Reason: Preview DOM src differs from state — manual preview may differ
```

---

## Coverage & performance

- **Coverage:** tracks which engines were exercised (`coveragePercent` in report)
- **Performance:** per-scenario `durationMs` in report

---

## Release gate

Exit code `0` = all checks passed (FAIL count = 0).  
Exit code `1` = at least one FAIL — do not release.

Integrate in CI:

```yaml
- run: node scripts/run-validation.mjs
```

---

## Engine audit (always run)

- Intent Resolution — module loaded
- Design Memory — module loaded
- Image Intelligence — module loaded
- Text Intelligence — module loaded
- Edit Session — module loaded
- Pipeline — module loaded
- Orchestrator — module loaded
- Node syntax — all core JS files

No product UX, wording, or AI behaviour is modified by the validation engine.
