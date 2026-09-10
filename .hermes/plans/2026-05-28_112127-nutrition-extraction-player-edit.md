# Plan: Nutrition extraction from `[list]` meal text in `player-edit`

## Goal

Decide and design a reliable way to take meal description text like:

```text
[list]
Huevos (2 piezas)
Tortilla de maíz (2 piezas)
[b][i]Para la ensalada[/i][/b]
[sub-list]Jitomate[/sub-list]
[/list]
```

and derive calories, macros, and ideally micronutrients for each ingredient and totals, without adding a WYSIWYG editor.

## Short recommendation

Use a hybrid approach:

1. Parse the local `[list]`, `[sub-list]`, `[b]`, `[i]` markup into structured ingredient lines.
2. Send those parsed ingredient lines to an LLM only for normalization/extraction, not for nutrition facts.
3. Query a nutrition database/API for actual macro/micro nutrient values.
4. Save the resolved nutrition output back to Firestore as structured data alongside the original text.

Do not rely only on an LLM for final calories/macros/micros. LLMs are useful for understanding messy Spanish meal text, but they can hallucinate nutrition values. A nutrition API is better for the facts.

## Current context / assumptions

- The editable text is currently in `src/app/features/ascenso/admin/player-edit/player-edit.html` around the meal description textarea.
- The text is saved to Firestore as plain text in `meal.descripcion`.
- A decoder already converts `[list]`, `[sub-list]`, `[b]`, `[i]` to preview HTML in `PlayerEditComponent`.
- The app is Angular/Firebase, and admin updates go through `AdminRepository.updatePlayer(...)`.
- The example text mixes ingredient lines and section/header formatting:
  - Ingredient: `Huevos (2 piezas)`
  - Ingredient: `Tortilla de maíz (2 piezas)`
  - Header: `[b][i]Para la ensalada[/i][/b]`
  - Ingredient: `[sub-list]Jitomate[/sub-list]`

## Why API-only is hard

A nutrition API works best when given normalized inputs like:

```json
[
  { "name": "egg", "quantity": 2, "unit": "piece" },
  { "name": "corn tortilla", "quantity": 2, "unit": "piece" },
  { "name": "tomato", "quantity": null, "unit": null }
]
```

But the admin text will often be messy:

- Spanish ingredient names.
- Informal quantities: `2 piezas`, `un puño`, `al gusto`, `1 taza`, `medio aguacate`.
- Headers that are not ingredients: `Para la ensalada`.
- Missing portions: `Jitomate` without grams/pieces.
- Multiple ingredients in one line.
- Brand/product-specific foods.

So an API alone may fail unless the input is already structured.

## Why LLM-only is risky

An LLM can parse the text and estimate values, but nutrition numbers are factual and quantity-sensitive. For example:

- `Huevos (2 piezas)` depends on egg size.
- `Tortilla de maíz (2 piezas)` depends on tortilla size/brand/weight.
- `Jitomate` has no amount.

An LLM may give confident but inaccurate macro/micro values. It is acceptable for rough estimates, but not ideal if the app presents the values as authoritative.

## Proposed approach

### Phase 1: Local markup extraction

Create a parser that converts the saved description string into a list of candidate food lines.

Rules:

- Strip display-only tags: `[b]`, `[/b]`, `[i]`, `[/i]`.
- Treat `[list]...[/list]` as the main list block.
- Treat `[sub-list]...[/sub-list]` as nested list items.
- Split by lines.
- Ignore empty lines.
- Classify obvious headers as `section`, not `ingredient`.
  - Example: `[b][i]Para la ensalada[/i][/b]` -> section header.
- Preserve original text for traceability.

Example output:

```json
{
  "sections": [
    {
      "title": null,
      "items": [
        { "raw": "Huevos (2 piezas)", "level": 0 },
        { "raw": "Tortilla de maíz (2 piezas)", "level": 0 }
      ]
    },
    {
      "title": "Para la ensalada",
      "items": [
        { "raw": "Jitomate", "level": 1 }
      ]
    }
  ]
}
```

### Phase 2: Normalize ingredients

Use either:

Option A: deterministic parser first
- Regex quantity patterns:
  - `(2 piezas)`
  - `2 piezas`
  - `100g`, `100 g`, `1 taza`, `1 cucharada`
- Map Spanish units to normalized units.
- Map common Spanish ingredients to English/API-friendly names.

Option B: LLM normalization fallback
- Send only candidate ingredient lines to the LLM.
- Ask for strict JSON.
- The LLM should return:

```json
[
  {
    "raw": "Huevos (2 piezas)",
    "ingredient": "huevo",
    "quantity": 2,
    "unit": "pieza",
    "query": "egg",
    "confidence": "high",
    "needsUserPortion": false
  },
  {
    "raw": "Jitomate",
    "ingredient": "jitomate",
    "quantity": null,
    "unit": null,
    "query": "tomato",
    "confidence": "medium",
    "needsUserPortion": true
  }
]
```

Recommended: start with deterministic parsing, then use LLM only when the parser cannot confidently normalize.

### Phase 3: Nutrition lookup

Use a nutrition data source for factual nutrient values. Candidates:

1. USDA FoodData Central
   - Pros: authoritative, detailed micro nutrients, free API key.
   - Cons: English-oriented, needs search/disambiguation.

2. Edamam Nutrition Analysis API
   - Pros: accepts natural language ingredient lines better.
   - Cons: paid tiers/limits, may be easier for Spanish only after translation.

3. Nutritionix
   - Pros: natural language search, common foods/brands.
   - Cons: API limits and commercial terms.

4. Open Food Facts
   - Pros: free, brand/product database.
   - Cons: less reliable for generic cooked foods and micronutrients.

Recommendation:
- For generic ingredients and micros: USDA FoodData Central.
- If natural-language parsing is more important than detailed micros: Edamam or Nutritionix.

### Phase 4: Disambiguation and confidence

For each normalized ingredient:

- Query nutrition API.
- Pick best candidate by name similarity, food category, and language mapping.
- If quantity is missing, mark item as needing portion input.
- If match confidence is low, keep item unresolved and show warning.

Example unresolved item:

```json
{
  "raw": "Jitomate",
  "status": "needs_portion",
  "message": "Agrega cantidad, por ejemplo: Jitomate (100 g)"
}
```

### Phase 5: Firestore data model

Keep original text unchanged, and add structured computed nutrition separately.

Possible shape under each meal:

```json
{
  "descripcion": "[list]\nHuevos (2 piezas)\n...[/list]",
  "nutrition": {
    "status": "complete|partial|error|stale",
    "source": "usda+llm-normalizer",
    "computedAt": "timestamp",
    "items": [
      {
        "raw": "Huevos (2 piezas)",
        "normalizedName": "egg",
        "quantity": 2,
        "unit": "piece",
        "calories": 144,
        "macros": {
          "proteinG": 12.6,
          "carbsG": 0.8,
          "fatG": 9.6
        },
        "micros": {
          "sodiumMg": 142,
          "calciumMg": 56,
          "ironMg": 1.8
        },
        "sourceFoodId": "...",
        "confidence": 0.86
      }
    ],
    "totals": {
      "calories": 260,
      "proteinG": 16,
      "carbsG": 26,
      "fatG": 11
    },
    "warnings": [
      "Jitomate needs portion size"
    ]
  }
}
```

This avoids destroying the admin-authored description and allows recalculation later if the parser/API improves.

## Step-by-step implementation plan

### 1. Add a nutrition extraction service boundary

Likely files:

- `src/app/data/services/nutrition-parser.ts`
- `src/app/data/services/nutrition-api.ts`
- or, preferably for secrets, a backend/server endpoint under the existing `server/` directory if API keys are needed.

Do not put nutrition API keys in Angular frontend code.

### 2. Implement local markup-to-lines parser

Likely unit-testable pure functions:

- `extractMealLines(description: string): MealLine[]`
- `stripMarkupTags(value: string): string`
- `classifyMealLine(value: string): 'ingredient' | 'section' | 'note'`

Validation examples:

Input:

```text
[list]
Huevos (2 piezas)
Tortilla de maíz (2 piezas)
[b][i]Para la ensalada[/i][/b]
[sub-list]Jitomate[/sub-list]
[/list]
```

Expected ingredient candidates:

```json
[
  "Huevos (2 piezas)",
  "Tortilla de maíz (2 piezas)",
  "Jitomate"
]
```

Expected section/header:

```json
["Para la ensalada"]
```

### 3. Add ingredient normalization

Start deterministic:

- Quantity/unit regex.
- Spanish unit mapping:
  - `pieza`, `piezas`, `pz` -> `piece`
  - `g`, `gr`, `gramos` -> `g`
  - `kg` -> `kg`
  - `ml` -> `ml`
  - `taza`, `tazas` -> `cup`
  - `cucharada` -> `tbsp`
  - `cucharadita` -> `tsp`
- Common ingredient dictionary:
  - `huevo`, `huevos` -> `egg`
  - `tortilla de maíz` -> `corn tortilla`
  - `jitomate`, `tomate` -> `tomato`

Then add LLM normalization only as a fallback or server-side optional path.

### 4. Add backend nutrition endpoint

Recommended endpoint shape:

`POST /api/nutrition/analyze-meal`

Request:

```json
{
  "description": "[list]...[/list]",
  "locale": "es-MX"
}
```

Response:

```json
{
  "status": "complete|partial|error",
  "items": [],
  "totals": {},
  "warnings": []
}
```

Responsibilities:

- Parse/normalize input.
- Call external nutrition API.
- Optionally call an LLM for normalization only.
- Return confidence/warnings.
- Keep API keys server-side.

### 5. Add UI action in `player-edit.html`

Add a button near the description field:

- `ANALIZAR NUTRIENTES`
- Disabled while analyzing.
- Shows per-ingredient results and totals.
- Shows warnings for missing portions.

Avoid running the analysis on every keystroke to prevent API cost and rate-limit problems.

### 6. Save computed result

In `src/app/features/ascenso/admin/player-edit/player-edit.ts`, when saving:

- Keep `meal.descripcion` as original plain markup text.
- Include `meal.nutrition` if analysis has been run.
- Mark `nutrition.status = 'stale'` if `descripcion` changes after analysis.

### 7. Add validation/tests

If test setup exists or is added:

- Unit tests for parser:
  - list extraction
  - sub-list extraction
  - bold/italic stripping
  - header detection
  - malformed/missing closing tags
- Unit tests for quantity parsing.
- Integration test/mocked service for nutrition endpoint.

Manual validation:

1. Open player edit.
2. Enter the example meal description.
3. Confirm preview still renders list/sub-list/bold/italic.
4. Click analyze nutrients.
5. Confirm items are extracted:
   - Huevos, 2 pieces
   - Tortilla de maíz, 2 pieces
   - Jitomate, missing quantity warning or default quantity if configured
6. Confirm save persists both original text and structured nutrition.
7. Reload player and confirm nutrition data displays.

## Files likely to change

Frontend:

- `src/app/features/ascenso/admin/player-edit/player-edit.html`
- `src/app/features/ascenso/admin/player-edit/player-edit.ts`
- `src/app/features/ascenso/admin/player-edit/player-edit.css`
- `src/app/data/models/player/meal-plan.ts`
- Possible new file: `src/app/data/models/player/nutrition.ts`
- Possible new file: `src/app/data/services/nutrition.ts`

Backend/server:

- `server/...` existing API entrypoint/routes, exact path to inspect before implementation.
- New nutrition route/service files depending on current server structure.

Config/secrets:

- Environment variable for nutrition API key, e.g. `USDA_FDC_API_KEY`.
- Optional LLM key only if server-side LLM normalization is used.

## Tests / validation

Run after implementation:

```bash
npm run build
```

If tests are added/configured:

```bash
npm test
```

Also validate backend route with a sample request once the server structure is known.

## Risks and tradeoffs

### Nutrition accuracy

- API results vary by food entry and serving assumptions.
- Missing quantities cannot produce reliable totals.
- Brand-specific foods need brand-aware search or user confirmation.

### LLM cost and reliability

- LLM normalization adds cost and latency.
- Strict JSON output must be validated server-side.
- LLM should not be the authoritative nutrition source.

### API limits

- Nutrition APIs may rate-limit requests.
- Add caching by normalized ingredient + quantity + unit.
- Prefer explicit button-triggered analysis over automatic analysis.

### Secrets

- External API keys must not be exposed in Angular frontend bundles.
- Nutrition requests should go through a backend/server endpoint or Cloud Function.

### UX

- Admins need clear warnings when quantities are missing.
- Results should show confidence/source so users know it is an estimate.

## Open questions

1. Which nutrition data provider should be used?
   - USDA is best for detailed nutrients and authority.
   - Edamam/Nutritionix may be easier for natural language ingredients.

2. Should ingredients with missing quantity use a default serving or require admin input?
   - Recommended: require admin input or mark as partial.

3. Should nutrition results be visible to players, admins only, or both?

4. Should the app support only Spanish/Mexican meal text, or multiple locales?

5. Should analysis happen in the existing server folder, Firebase Cloud Functions, or another backend?

## Recommended first milestone

Implement only extraction + normalization preview first, without API calls:

- Parse the markup text.
- Show extracted ingredients and detected quantities under the textarea.
- Flag missing quantities.

Once extraction quality looks good, add the backend nutrition API lookup.
