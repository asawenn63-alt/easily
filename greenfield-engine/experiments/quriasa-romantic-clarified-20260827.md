# QuriAsa — clarified style test, 2026-08-27

## Scope and input

One completed creative run, saved separately. No generated code or images were corrected afterward.

Source brief: `runs/easily-614fe330-80e3-4b48-861f-6baeeda711c5-2026-08-27T15-20-30-725Z/brief.json`.

Test brief: `briefs/quriasa-romantic-clarified-20260827.json`.
Only answer 3 was extended with the user's clarification: “mycket vitt, spets, vintage och romantik”. All other answers and constraints are unchanged.

Test brief file SHA-256: `775C65F3EA8829BDCDA470CAA42B66CF2B0BA4E9ABB39F8B2529ED01F3431079`.
Generator file SHA-256 at execution: `2A3F52FF9634543554AE95C4E7B8E0B0957A2DA1D116585EF17F01E18855F5BD`.

## Instruction change

The two system prompts were simplified. Mandatory photographic treatment and image dominance were removed. `assetPlan.minItems` changed from 4 to 0; the maximum remains 6. Media may now be photographs, illustrations, textures or ornaments, as chosen for the brief. No industry-specific recipe was added. Model settings, image configuration, execution logic and safety checks remain unchanged, including restrictions on external fonts/network resources.

This test changes both the instructions and the brief clarification. It cannot isolate the causal contribution of either change or establish cross-brief design diversity.

## Execution

- Technical failed attempt: `quriasa-romantic-clarified-20260827-2026-08-27T17-04-50-416Z`. `fetch failed` before any AI output was received; only brief.json was saved.
- One technical retry with the same input/configuration and network permission.
- Completed run: `quriasa-romantic-clarified-20260827-2026-08-27T17-06-23-946Z`.
- Model: `gpt-5.6-sol`; image model: `gpt-image-1-mini`; quality: `medium`; format: WebP; size selection unchanged.
- Output: `output/quriasa-romantic-clarified-20260827/`.
- AI-created files: `index.html`, `styles.css`, `site.js` and six WebP assets.
- Preview: http://127.0.0.1:3869/preview/quriasa-romantic-clarified-20260827/

## Checks and observed outcome

- Generator and generated JavaScript syntax checks passed.
- Offline checks passed: optional 0–6 assets; precisely five answers; only the style answer changed.
- Before/after source comparison confirmed changes confined to the two system prompts and asset minimum.
- 66 protected-file SHA-256 hashes matched: golden QuriAsa plus the two preceding comparison runs and their output copies.
- The preview hero was visually inspected. The requested white/patinated vintage material direction is more explicit, but a large serif headline, italic emphasis, small letterspaced uppercase label and dominant soft photograph persist.
- Selected Art Direction explicitly requested high-contrast serif, italic emphasis and letterspaced category labels before code generation. Thus these traits are still authored choices, not evidence of a renderer substituting them.
- Below-the-fold browser interaction could not be completed with the available browser-control session; this is not a full-page or responsive acceptance test.

Conclusion: technically completed; recurring design-DNA problem NOT demonstrated solved. No further generation or correction performed.
