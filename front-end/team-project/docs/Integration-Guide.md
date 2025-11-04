# Integration Guide

This guide covers FHIR, database/mock, and AI integrations, along with performance, configuration, deployment, and troubleshooting.

## FHIR Integration

- Client: `src/services/fhirClient.js` uses SMART-on-FHIR (`fhirclient`). It attempts OAuth2 (`client.oauth2.ready`) and falls back to direct `baseUrl` if SMART is not available.
- Supported resources (via adapters/validators): Patient, Encounter, Observation, DiagnosticReport, ServiceRequest.
- Common operations:
  - `getPatients({ limit, sort, filters })` → `Patient` search with `_count`, `_sort`, and custom filters.
  - `getPatient(patientId)` → fetch a single `Patient`.
  - `getPatientEncounters(patientId)` → `Encounter` search by patient with sort and paging.
  - `getPatientObservations(patientId, encounterId?)` → observations by patient (optionally scoped to an encounter).
- Initialization:
  - Call `fhirClient.initialize(fhirServerUrl, authConfig)`. Provide your FHIR base URL. For SMART, configure `clientId`, `scope`, and `redirectUri` according to your authorization server.
  - If initialization fails, the app seamlessly switches to mock data.
- Validation and Mapping:
  - `src/utils/fhirValidator.js` performs schema, enum, and temporal checks; returns errors and warnings for UI/logging.
  - `src/utils/fhirAdapter.js` converts raw FHIR resources into UI-ready models for rendering and analytics.

### Configuration

- SMART setup: Update `fhirClient.initialize(...)` to inject your `clientId` and `redirectUri`. You may choose to read these via environment variables.
- Non-SMART setup: Provide `fhirServerUrl` and rely on the fallback client.
- Connection tooling: Use `FHIRConnectionManager.js` and `FHIRConnectionStatus.js` to manage and visualize connectivity.

### Error Handling

- Network/auth/catalog failures and invalid resources are caught; services emit console errors and the UI uses mock fallbacks when possible.
- Unknown enums and optional fields surface as warnings; missing required fields produce errors.

## Database / Mock Integration

- Current default: mock JSON under `public/mock-data/` supports offline development and demo flows.
- `dataSyncService.js` orchestrates loading, live updates, and subscriber notifications; in absence of a live FHIR server, it hydrates the UI from mock data.
- To integrate a database-backed API:
  - Implement endpoints in your backend and consume them in `restApiService.js`.
  - Keep return shapes aligned with `fhirAdapter` outputs or add a dedicated adapter for your API.

## AI Integration

- Module: `src/services/aiDataService.js` synthesizes realistic clinical events to augment timelines (administrative, monitoring, treatment, diagnostic, coordination) and assigns confidence scores.
- Injection points: After FHIR/mock data is adapted, `aiDataService` can append events via a service layer function (e.g., `enhanceWithAITimestamps`).
- Event shape: timestamped entries with category, label, details, and `confidence`.
- Usage: Enable/disable augmentation within the service flow as needed for demos vs. strict clinical-only views.

## Performance & Resilience

- Fallbacks: Graceful downgrade to mock data when FHIR is unavailable.
- Batching & limits: Use `_count` and sorting judiciously; paginate large resource queries.
- UI performance: Favor lightweight lists and memoized renders; avoid blocking calls in render paths.
- Network: Debounce searches/filters; cache recent resource lookups when appropriate.

## Configuration & Deployment

- Local dev: `npm install` → `npm start` (CRA dev server at http://localhost:3000).
- Build: `npm run build` → outputs production assets in `build/`.
- Environment variables (recommended): externalize FHIR base URL and SMART credentials and read them in `fhirClient.initialize(...)`.
- Hosting: Any static hosting that serves the CRA build. Ensure `redirectUri` aligns with your hosting origin if using SMART.

## Troubleshooting

- SMART redirect loop: Verify `clientId`, `redirectUri`, and FHIR `iss` value; ensure HTTPS where required.
- Empty dashboards: Check FHIR connectivity in the FHIR tools panel; confirm mock data presence under `public/mock-data/`.
- Validation errors: Review console output from `fhirValidator` and ensure resource completeness.
- CORS/auth failures: Confirm FHIR server CORS and token audience match the app origin.

