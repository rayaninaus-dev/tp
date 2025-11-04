# Developer Guide

This guide describes the project architecture, code layout, data flow, core services, and local development practices for the Emergency Department dashboard.

## Overview

- Purpose: A React-based operational dashboard for emergency departments that visualizes patients, encounters, vitals, critical alerts, KPIs, turnaround times, and more.
- Tech stack: React (CRA), Tailwind/PostCSS, lightweight service layer for FHIR + REST/mock integration.
- Key sources: FHIR R4 server (optional), mock data for offline/local use, AI augmentation for timelines.

## Architecture

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                         Frontend (React)                        │
 │ ┌─────────────┬───────────────┬───────────────┬───────────────┐ │
 │ │ Overview    │ Analytics      │ Alerts         │ Records       │ │
 │ └─────────────┴───────────────┴───────────────┴───────────────┘ │
 │ ┌─────────────┬───────────────┬───────────────┬───────────────┐ │
 │ │ Patients    │ Timeline       │ FHIR Tools     │ Shared UI     │ │
 │ └─────────────┴───────────────┴───────────────┴───────────────┘ │
 └─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                           Services                              │
 │  dataSyncService   fhirClient   restApiService   aiDataService  │
 │          fhirAdapter (map FHIR→UI)     fhirValidator            │
 └─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                        Data Providers                           │
 │  FHIR R4 server (optional)     Mock JSON (local)                │
 └─────────────────────────────────────────────────────────────────┘
```

## Code Layout

Top-level folders and notable files.

```
team-project/
├─ src/
│  ├─ components/
│  │  ├─ Overview.js
│  │  ├─ DepartmentAnalytics.js
│  │  ├─ TurnaroundTimes.js
│  │  ├─ KPICards.js
│  │  ├─ PatientList.js
│  │  ├─ TimelineModal.js
│  │  ├─ ClinicalRecords.js
│  │  ├─ AlertPanel.js, CriticalAlerts.js
│  │  ├─ fhir/
│  │  │  ├─ FHIRConnectionManager.js
│  │  │  ├─ FHIRConnectionStatus.js
│  │  │  ├─ FHIRResourceViewer.js
│  │  │  └─ FHIRSearchPanel.js, FHIRTestPanel.js
│  │  └─ ui/ (shared UI)
│  ├─ services/
│  │  ├─ dataSyncService.js
│  │  ├─ fhirClient.js
│  │  ├─ restApiService.js
│  │  └─ aiDataService.js
│  ├─ utils/
│  │  ├─ fhirAdapter.js
│  │  └─ fhirValidator.js
│  └─ models/
│     └─ fhirTypes.js
└─ public/mock-data/
   ├─ encounter-001.json …
   └─ ed-summary.json
```

## Core Services

- dataSyncService.js: Centralized data sync and publish–subscribe for dashboard data. Provides subscribe/unsubscribe and pushes updates from FHIR/mock sources. Includes fallback handling and status updates for UI.
- fhirClient.js: FHIR client via SMART-on-FHIR `fhirclient` with a fallback to direct baseUrl access. Provides methods like `getPatients`, `getPatient`, `getPatientEncounters`, `getPatientObservations` with robust error handling and mock fallback when not initialized.
- restApiService.js: Thin wrapper for REST endpoints (if used). Can be adapted to connect to a backend or remain a mock provider during development.
- aiDataService.js: Generates AI-augmented timeline events (e.g., admission, vitals, treatments, diagnostics, coordination) with confidence scores to enrich the UI timeline.

## Utilities

- fhirAdapter.js: Converts FHIR R4 resources (Patient, Encounter, Observation, DiagnosticReport, ServiceRequest) into the UI’s normalized format. Handles edge cases and missing fields.
- fhirValidator.js: Validation helpers for common FHIR resources (structure, enums, temporal consistency) and a Bundle validator; returns errors/warnings for UI surfacing or logging.

## Components (Selected)

- Overview.js: Landing dashboard; aggregates KPIs and entry points.
- DepartmentAnalytics.js, TurnaroundTimes.js, LOS.js: Analytics and performance metrics.
- PatientList.js: Search/filter/list with status and priority indicators.
- TimelineModal.js / EnhancedTimelineModal.js: Patient timeline with events (FHIR + AI augmentation).
- AlertPanel.js, CriticalAlerts.js: Clinical and operational alerts.
- ClinicalRecords.js: Consolidated clinical view across encounters.
- FHIR Tooling: FHIRConnectionManager, FHIRConnectionStatus, FHIRResourceViewer, FHIRSearchPanel, FHIRTestPanel for exploration and connectivity.

## Data Flow

1) Source: FHIR R4 server (optional) and/or local mock JSON.
2) Fetch: `fhirClient` (SMART client; fallback to baseUrl) or `restApiService`.
3) Validate: `fhirValidator` checks resource structure and values.
4) Adapt: `fhirAdapter` maps resources to UI-friendly data.
5) Sync: `dataSyncService` publishes updates; components subscribe and render.
6) Augment: `aiDataService` enriches timelines with realistic events + confidence.

## Local Development

- Requirements: Node.js 16+, npm 8+, modern browser.
- Install: `npm install`
- Start: `npm start` (serves at http://localhost:3000)
- Test: `npm test`
- Build: `npm run build`

## Configuration Notes

- FHIR server URL and SMART config are provided to `fhirClient.initialize(fhirServerUrl, authConfig)`. The implementation currently sets `clientId` and `redirectUri` inline; adapt these for your environment (or externalize via environment variables) to enable full SMART flows.
- When FHIR is unavailable or not initialized, services gracefully fall back to mock data in `public/mock-data/`.

## Error Handling & Fallbacks

- All service calls prefer live FHIR; on failure, they return mock data where possible.
- Validation warns on unknown enums and non-critical issues and errors on missing required fields.

## Feature Checklist (Summary)

- Overview/KPI dashboard, patient list/search/filter, analytics (turnaround/LOS), alerts, timeline modal, responsive layout.
- FHIR connection manager, resource viewer, search panel, validation and adaptation.
- AI-augmented events with confidence scores.
- Robust fallbacks to mock data.

## Contributing

- Keep adapters and validators cohesive and covered by basic tests.
- Prefer small, composable components; colocate styles where appropriate.
- Update this guide if you add new services or integration points.

