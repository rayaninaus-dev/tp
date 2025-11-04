# Changelog

All notable changes to this project will be documented in this file.

## 2025-09-04

- Add: `public/mock-data/department-analytics.json` mock analytics data to prevent load errors in analytics view.
- Fix: Cleaned UI text encoding issues in patient list (demographics line, SpO2 label) and turnaround labels.
- Improve: Persist FHIR connection settings (server URL and connection state) via `localStorage` in `FHIRConnectionManager` and restore on mount.
- Improve: REST search resilience — if server rejects `_sort=-_lastUpdated` with 400/422, automatically retry without `_sort`.

### Requirement Alignment Enhancements
- Add: Derived "4-Hour Target" KPI in `DepartmentAnalytics` using existing turnaround steps (non-breaking, displayed when data is available). Shows estimated journey time vs 240 min with status badge (On Target / At Risk / Off Target).
- Add: Online analytics via `restApiService.getAnalytics()` that computes LOS from Encounter.period and overrides lab/imaging turnaround when DiagnosticReport timestamps are available. `App.js` prefers this when FHIR is connected, and safely falls back to mock JSON otherwise.

Notes:
- All changes are additive and preserve existing behavior and component APIs.
- No breaking changes; mock fallback behavior remains unchanged.
