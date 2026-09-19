# AI Design Orchestrator

The single brain coordinating every intelligence engine in Easily. Every user request follows a reasoning workflow before any mutation runs.

**Module:** `js/ai-design-orchestrator.js`  
**Entry point:** `AIDesignOrchestrator.run(opts)`  
**Wired in:** `EditCommandPipeline.orchestrateExecution()` (all non-session actions)

---

## Architecture

```
User message
    │
    ▼
EditCommandPipeline.run()
    │
    ▼
Intent Resolution Engine.resolve()
    │
    ▼
AIDesignOrchestrator.run()
    │
    ├─ 1. gatherContext()           intent, Design Memory, Edit Session, locks
    ├─ 2. buildExecutionPlan()      internal checklist + engine steps
    ├─ 3. runPlanningPhase()        consult engines without mutating
    │       ├─ Design Memory.consultBeforeExecute
    │       ├─ Image Intelligence.plan (pre-validate vs memory)
    │       └─ Text Intelligence.plan (preview copy direction)
    ├─ 4. executePlan()             Edit Pipeline.executeIntentWithMemory
    │       └─ optional companion text step (holistic refinements)
    ├─ 5. validateChain()           preview + memory + site consistency
    ├─ 6. internalQualityLoop()     retry if improvement score too low
    └─ 7. return pipeline result    (plan/checklist never shown to user)
            │
            ▼
EditSession.wrapPipelineResult()
    │
    ▼
User sees calm designer response
```

---

## Execution lifecycle

| Phase | What happens |
|-------|----------------|
| **Understand intent** | Uses IRE resolution + selected action |
| **Read Design Memory** | `getMemory()`, `getConstraints()`, summarize |
| **Read Edit Session** | Session state, pending verification, accepted locks |
| **Decide engines** | Image / Text / Memory / Consistency based on request |
| **Build plan** | Ordered steps with internal checklist |
| **Plan (no mutate)** | Pre-select image, preview text, consult memory |
| **Execute** | Pipeline runs primary intent (+ companion steps if holistic) |
| **Verify** | Pipeline verification + memory validation + site review |
| **Quality gate** | Internal score; retry up to 2× if below threshold |
| **Respond** | Existing pipeline messages — no internal reasoning exposed |

---

## Example internal plan

User: *"Jag vill ha en mer premium hero."*

Internal checklist (logged only):

```
✓ understand intent
✓ hero section
✓ image refinement
✓ headline refinement
✓ CTA review
✓ verify consistency
✓ update memory
```

Engine sequence:

1. Design Memory — read constraints  
2. Image Intelligence — plan hero image (premium), validate vs memory  
3. Text Intelligence — plan hero copy direction  
4. Text Intelligence — CTA review  
5. Edit Pipeline — execute hero.image.refine  
6. Edit Pipeline — companion text.regen (optional, if primary succeeds)  
7. Consistency Controller — site review + quality gate  

---

## Engine scheduler

| Engine | Planning ops | Execution |
|--------|--------------|-----------|
| Intent Resolution | Already resolved before orchestrator | — |
| Design Memory | `read`, `consult`, `validateProposal` | via `handleKeep` after user accepts |
| Edit Session | `read` locks/context | via pipeline `beginEdit` / `wrapPipelineResult` |
| Image Intelligence | `plan_select` with conflict retries | via MaterialSystem in pipeline |
| Text Intelligence | `plan_generate`, `plan_cta_review` | via TextChatCommands in pipeline |
| Edit Pipeline | — | `executeIntentWithMemory` |
| Consistency Controller | `site_review`, `quality_gate` | internal scoring only |

Holistic aesthetic requests (premium, modern, warmer, luxurious…) on hero/about automatically add companion image + text planning steps.

---

## Conflict resolver

When Image Intelligence selects a candidate and Design Memory rejects it:

1. Log conflict `[Easily · orchestrator] CONFLICT`  
2. Policy: **Design Memory wins**  
3. Record rejected URL in Image Intelligence  
4. Retry selection (up to 4 attempts) before pipeline executes  

Same pattern applies for text vs memory validation during planning.

---

## Validation chain

| Check | Source |
|-------|--------|
| State/DOM changed | `EditCommandPipeline.verifyChange` |
| Image matches memory | `DesignMemoryEngine.validateProposal` on hero URL |
| Holistic improvement | Companion text step success |
| Site consistency | Hero title + image + global mood alignment |
| Quality score | Combined ≥ 0.52 or retry |

Scores and checklists are never shown in chat.

---

## Consistency controller

Protects the whole website, not just the edited section:

- Reads approved global mood and typography tone  
- Checks focus section has coherent title + image when relevant  
- Penalizes quality score when memory validation fails  
- Companion text regeneration only runs after successful primary step  

---

## Public API

| Method | Purpose |
|--------|---------|
| `run(opts)` | Full orchestration lifecycle |
| `gatherContext(text, hooks, resolution)` | Context bundle |
| `buildExecutionPlan(ctx)` | Internal plan object |
| `runPlanningPhase(plan, ctx)` | Non-mutating engine consultation |
| `executePlan(plan, ctx, exec)` | Run pipeline steps |
| `validateChain(plan, execution, exec)` | Post-execution validation |
| `resolveConflict(conflict)` | Engine disagreement policy |
| `reviewSiteConsistency(section)` | Whole-site coherence score |

### Run options

| Field | Meaning |
|-------|---------|
| `text` | User message |
| `hooks` | Welcome-flow pipeline hooks |
| `resolution` | IRE resolution object |
| `action` | Selected pipeline action |
| `exec.executeIntentWithMemory` | Pipeline execution callback |

---

## Logging

```
[Easily · orchestrator] { stage: "PLAN", planId, section, engines, checklist, action }
[Easily · orchestrator] { stage: "PLANNING", outcomes, checklist }
[Easily · orchestrator] { stage: "CONFLICT", type, accepted, score }
[Easily · orchestrator] { stage: "VALIDATE", score, improved, verified }
[Easily · orchestrator] { stage: "QUALITY_RETRY", attempt }
```

Internal reasoning only — user experience stays a calm professional designer.

---

## Script order

Load after all intelligence engines, before `edit-command-pipeline.js`:

```
design-memory-engine.js
image-intelligence-engine.js
text-intelligence-engine.js
intent-resolution-engine.js
ai-design-orchestrator.js   ← here
edit-command-pipeline.js
```
