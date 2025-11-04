// apiService.js
import fhirClient from './fhirClient';
import { adaptDashboardData, adaptEncounterData } from '../utils/fhirAdapter';

class ApiService {
  constructor() {
    this.fhirClient = fhirClient;
    this.fhirClient.initialize('https://hapi.fhir.org/baseR4');
  }

  async getDashboardData(useFhir = false) {
    if (useFhir) {
      const fhirData = await this.fhirClient.getDashboardData();
      return adaptDashboardData(fhirData, true);
    } else {
      const response = await fetch('/mock-data/ed-summary.json');
      const data = await response.json();
      return adaptDashboardData(data, false);
    }
  }

  async getAnalyticsData() {
    const response = await fetch('/mock-data/department-analytics.json');
    return await response.json();
  }

  async getPatientTimeline(patientId, useFhir = false) {
    if (useFhir) {
      const encounters = await this.fhirClient.getPatientEncounters(patientId);
      if (encounters.length > 0) {
        return adaptEncounterData(encounters[0].resource, true);
      }
      return [];
    } else {
      const response = await fetch(`/mock-data/encounter-${patientId.slice(-3)}.json`);
      const mockData = await response.json();
      return adaptEncounterData(mockData, false);
    }
  }

  async searchFhirResources(resourceType, query) {
    return this.fhirClient.search(resourceType, query);
  }

  getFhirConnectionStatus() {
    return this.fhirClient.isInitialized;
  }
}

const apiService = new ApiService();
export default apiService;
