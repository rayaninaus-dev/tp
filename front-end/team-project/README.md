# Emergency Department Dashboard

A React-based operational dashboard for emergency departments. It visualizes patients, encounters, vitals, critical alerts, KPIs, turnaround times, and more. Optional FHIR integration enables live data; mock data supports offline development.

## Quick Start

- Requirements: Node.js 16+, npm 8+, modern browser
- Install: `npm install`
- Start: `npm start` → http://localhost:3000
- Test: `npm test`
- Build: `npm run build`

### python backend
    ```bash
    conda env create -f environment.yml
    ```
  **Activate the new environment:**
    ```bash
    conda activate prophet_env
    ````
    **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```

## Documentation

- Developer Guide: `docs/Developer-Guide.md`
- Integration Guide (FHIR, DB/Mock, AI, performance): `docs/Integration-Guide.md`
- Changelog: `CHANGELOG.md`

## Notes

- FHIR is optional. The app falls back to mock data when no server is configured.
- SMART-on-FHIR configuration can be provided in `src/services/fhirClient.js` (see Integration Guide).

## Scripts (from Create React App)

- `npm start`: run the app in development mode
- `npm test`: run tests in watch mode
- `npm run build`: build for production
## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
