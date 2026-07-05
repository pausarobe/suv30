---
name: suv30-cochesnet-agent
description: Use when Codex needs to search coches.net or other SUV30 target marketplaces for car listings, define or adjust a scraping workflow, import marketplace results into the SUV30 SQLite database, or maintain the SUV30 Playwright scraper and import UI.
---

# SUV30 Marketplace Import Agent

Use this skill to automate a manual marketplace search and import listings into the SUV30 app.

## Operating Principles

- Keep the workflow manual-triggered unless the user explicitly asks for scheduling.
- Prefer a user-provided search URL with filters already applied. It is more stable than trying to drive every filter widget.
- Try less aggressive sources before insisting on coches.net if coches.net shows anti-bot pages.
- Import only plausible SUV30 candidates.
- Never overwrite user notes.
- Treat website scraping as brittle: log failures clearly and keep partial imports safe.
- Avoid duplicate listings by URL. If an imported URL already exists, update `lastSeen` and refresh structured fields when available.

## SUV30 Default Criteria

- Years: 2024, 2025, 2026.
- Max price: 30000 EUR, with radar tolerance around 30500 EUR.
- Max km: ideally 40000, acceptable to 50000, radar tolerance around 52000.
- Minimum power: 140 CV.
- Exclude diesel, pure electric, and PureTech.
- Accepted fuel: gasoline, hybrid, mild hybrid, PHEV.
- Priority locations: Zaragoza, Reus, Tarragona and nearby areas.
- Important fields: title, price, year, km, fuel, gearbox, horsepower, city, province, seller, source, URL.

## Implementation Workflow

1. Add or maintain a scraper module under `server/scrapers/cochesNetScraper.js`.
2. Use Playwright Chromium for dynamic pages.
3. Accept an input object with:
   - `source`
   - `searchUrl`
   - `modelId`
   - `maxResults`
4. Open the search URL, accept cookies when possible, wait for listing cards or links.
5. Extract listing URLs from the results page.
6. Visit each listing URL and extract fields using resilient text parsing.
7. Normalize numbers and Spanish labels.
8. Save imported listings through server-side DB helpers.
9. Return a summary: imported, updated, skipped, errors.

## Current Integration

- Scraper module: `server/scrapers/cochesNetScraper.js`.
- Generic import endpoint: `POST /api/import/listings`.
- Legacy coches.net endpoint: `POST /api/import/cochesnet`.
- Provider list endpoint: `GET /api/import/providers`.
- UI entry point: Mercado page, "Importar desde web".
- Required request body:
  - `source`
  - `searchUrl`
  - `modelId`
  - `maxResults`

## Supported Sources

- `cochesnet`
- `autohero`
- `ocasionplus`
- `flexicar`
- `automovilessanchez`
- `carza`
- `generic`

## Parsing Guidance

- Normalize text with whitespace collapsed.
- Prices usually appear as `27.900 €`; parse by removing dots and non-digits.
- Kilometers usually appear as `21.000 km`; parse by removing dots and non-digits.
- Power may appear as `160 CV`, `160cv`, or inside a title.
- Year can appear in specs or title; accept only 2024-2026 for primary import.
- Infer source as `coches.net`.
- Infer seller from labels such as `Profesional`, dealer blocks, or fallback to `Coches.net`.
- If a required field is missing, skip the listing and include the reason in the summary.

## Safety

- Keep the browser headless by default.
- Limit default imports to a small number such as 10.
- Do not bypass CAPTCHAs or anti-bot controls.
- If a site blocks access, return a clear error and suggest another source or importing from copied text.

## Validation

After changes:

- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.
- Test the import endpoint with a small `maxResults` value.
- Verify imported ads appear in `/api/advertisements` and Mercado.
