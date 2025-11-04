# 2025-fire
comp3820-proj8

## Seeding live FHIR demo data

If you want the dashboard to display real FHIR patients instead of falling back to mock data, push a small seed set to the FHIR server before starting the app.

```bash
cd front-end/team-project
node scripts/loadSampleFhirData.js
```

Environment variables:

- `FHIR_BASE_URL` (optional) – defaults to `https://r4.smarthealthit.org`. Point it to whichever server you use in the FHIR Connection Manager, e.g.

```bash
FHIR_BASE_URL=https://your-fhir-endpoint node scripts/loadSampleFhirData.js
```

This script upserts three sample Patients along with related Encounters and Observations (IDs `pt-ed-demo-*`). After it finishes, reload the dashboard; once it pulls those resources successfully, the data source badge will switch to `[REFRESH] Live FHIR Data` and the patient cards will expose their real bundles.***
