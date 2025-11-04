import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta, date
import joblib
import json
from typing import List, Dict, Any
import re

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from io import StringIO

# (Selenium imports)
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ===================================================================
# INITIALIZE API AND LOAD MODELS/PROFILES/DATA ON STARTUP
# ===================================================================

app = FastAPI(
    title="ED Prediction API (FHIR-compliant)",
    description="An API to forecast ED trends, intra-day arrivals, and patient acuity.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    arrival_profile_df = pd.read_csv('arrival_profile.csv', index_col='hour')
    triage_profile_df = pd.read_csv('triage_by_hour_profile.csv', index_col='hour')
    # --- NEW: Load the HOURLY profile for the new heatmap ---
    hourly_profile_df = pd.read_csv('hourly_arrival_profile.csv', index_col=0)
    # --------------------------------------------------------
    with open('holidays.json', 'r') as f:
        holidays_dict = {item['Date']: item['HolidayName'] for item in json.load(f)}
    
    # Load the trained RandomForest model
    streaming_model = joblib.load('streaming_model.joblib')
    with open('X_train_columns.json', 'r') as f:
        streaming_model_columns = json.load(f)
except FileNotFoundError as e:
    print(f"ERROR: A required model/profile/data file was not found. {e}")
    arrival_profile_df = None
    triage_profile_df = None
    hourly_profile_df = None # Add null check
    holidays_dict = {}
    streaming_model = None
    streaming_model_columns = []

# ===================================================================
# DATA MODELS (Pydantic) for FHIR Operations
# ===================================================================

class Holiday(BaseModel):
    Date: str
    HolidayName: str

class IntraDayInput(BaseModel):
    arrivals_so_far: int

class TriageInput(BaseModel):
    age: int
    gender: str
    transport: str
    temp: float
    heart_rate: float
    resp_rate: float
    o2_sat: float
    systolic_bp: float
    diastolic_bp: float
    pain_level: int
    hour_of_day: int

# ===================================================================
# HELPER FUNCTIONS (Flu Forecast & Scraper)
# ===================================================================

def generate_flu_forecast(periods, freq):
    """Helper function to generate a prophet forecast."""
    try:
        df = pd.read_csv('daily_flu_data.csv')
    except FileNotFoundError:
        return None, None
        
    df['Date'] = pd.to_datetime(df['Date'])
    
    if freq == 'D':
        prophet_df = df.rename(columns={'Date': 'ds', 'QLD': 'y'})
        model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=True)
    else:
        prophet_df = df.resample('W-Mon', on='Date').sum().reset_index().rename(
            columns={'Date': 'ds', 'QLD': 'y'}
        )
        model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)

    # --- THIS IS THE FIX: Removed the 'show_stan_stdout' argument ---
    model.fit(prophet_df)
    # ---------------------------------------------------------------
    
    # Store the fitted model in the dataframe object to reuse it
    prophet_df.model = model 
    
    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)
    return forecast, prophet_df

def extract_number_from_text(text_string: str) -> int:
    """Uses a regular expression to find the first number in a string."""
    match = re.search(r'\d+', text_string)
    return int(match.group(0)) if match else 0

# ===================================================================
# API ENDPOINTS (Refactored to FHIR Operation paths)
# ===================================================================

# --- MODULE 1: Flu Forecast ---

@app.get("/Observation/$flu-forecast-today", tags=["Module 1: Flu Forecast"])
def get_flu_forecast_today():
    """
    Generates a flu forecast for the current day, compares it to the historical
    average, and returns a contextual FHIR Observation resource.
    """
    forecast, prophet_df = generate_flu_forecast(periods=0, freq='D')
    if forecast is None:
        raise HTTPException(status_code=500, detail="daily_flu_data.csv not found.")
        
    today_df = pd.DataFrame({'ds': [datetime.today()]})
    # Use the fitted model from the helper function
    model_instance = prophet_df.model
    forecast = model_instance.predict(today_df)
    
    predicted_cases = round(forecast['yhat'].iloc[0]) if forecast['yhat'].iloc[0] > 0 else 0
    
    today = datetime.today()
    current_week = today.isocalendar()[1]
    historical_this_week = prophet_df[prophet_df['ds'].dt.isocalendar().week == current_week]
    historical_average = round(historical_this_week['y'].mean())

    risk_code = "L"
    risk_display = "Low"
    if predicted_cases > historical_average * 2:
        risk_code = "H"
        risk_display = "High"
    elif predicted_cases > historical_average * 1.2:
        risk_code = "A" # Abnormal
        risk_display = "Moderate"
    
    return {
        "resourceType": "Observation", "status": "final",
        "code": {"text": "Predicted Daily Influenza Cases for Queensland"},
        "effectiveDateTime": date.today().isoformat(),
        "valueQuantity": {"value": predicted_cases, "unit": "cases"},
        "interpretation": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": risk_code, "display": risk_display}]}],
        "referenceRange": [{"low": {"value": 0}, "high": {"value": historical_average * 1.2}, "text": f"Historical average for this week is approx. {historical_average} cases."}]
    }

@app.get("/MeasureReport/$flu-forecast-weekly", tags=["Module 1: Flu Forecast"])
def get_flu_forecast_weekly():
    """
    Generates a 6-week flu forecast and returns it as a FHIR List resource.
    """
    forecast, prophet_df = generate_flu_forecast(periods=6, freq='W')
    if forecast is None:
        raise HTTPException(status_code=500, detail="daily_flu_data.csv not found.")
        
    last_historical_date = prophet_df['ds'].max()
    fhir_observations = []
    future_forecast = forecast[forecast['ds'] > last_historical_date]

    for index, row in future_forecast.iterrows():
        week_start = row['ds']
        week_end = week_start + timedelta(days=6)
        predicted_cases = round(row['yhat']) if row['yhat'] > 0 else 0
        observation = {
            "resourceType": "Observation", "status": "final",
            "code": {"text": "Predicted Weekly Influenza Cases for Queensland"},
            "effectivePeriod": {"start": week_start.strftime('%Y-%m-%d'), "end": week_end.strftime('%Y-%m-%d')},
            "valueQuantity": {"value": predicted_cases, "unit": "cases"}
        }
        fhir_observations.append({"resource": observation})
    
    return {"resourceType": "List", "status": "current", "mode": "snapshot", "title": "Weekly Influenza Forecast for Queensland", "entry": fhir_observations}


# --- MODULE 2: Intra-Day Arrival Forecast ---

@app.post("/Organization/{org_id}/$predict-remaining", tags=["Module 2: Intra-Day Arrivals"])
def predict_remaining(org_id: str, data: IntraDayInput):
    """
    Estimates the remaining arrivals for the day at a specific organization
    based on the count so far.
    """
    if arrival_profile_df is None:
        raise HTTPException(status_code=500, detail="Arrival profile is not loaded.")
    
    now = datetime.now()
    current_hour = now.hour
    day_of_week_num = now.weekday()
    day_names = arrival_profile_df.columns.to_list()
    current_day_name = day_names[day_of_week_num]
    
    lookup_hour = current_hour - 1
    if data.arrivals_so_far <= 0 or lookup_hour < 0:
        raise HTTPException(status_code=400, detail="Not enough data for today to make a prediction.")

    try:
        percentage_so_far = arrival_profile_df.loc[lookup_hour, current_day_name]
        estimated_total_today = data.arrivals_so_far / percentage_so_far
        remaining_arrivals = estimated_total_today - data.arrivals_so_far
        
        return {
            "organization_id": org_id,
            "estimated_total_for_today": round(estimated_total_today),
            "remaining_arrivals_prediction": round(remaining_arrivals)
        }
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Could not find profile data for hour {lookup_hour}.")


# --- MODULE 3: Triage & Streaming Prediction (FHIR-like) ---

@app.post("/Patient/$assess-risk", tags=["Module 3: Acuity & Streaming"])
def get_triage_and_streaming_prediction(data: TriageInput):
    """
    Accepts patient features and returns a FHIR RiskAssessment resource
    predicting Triage Category and ED Department.
    """
    if triage_profile_df is None or streaming_model is None:
        raise HTTPException(status_code=500, detail="A required model/profile is not loaded.")

    try:
        # --- Prediction 1: Triage based on hour (from profile) ---
        probabilities = triage_profile_df.loc[data.hour_of_day]
        predicted_triage_level = probabilities.idxmax()
        predicted_triage_number = predicted_triage_level.split('_')[-1]
        
        # --- Prediction 2: Department Streaming (from ML model) ---
        input_df = pd.DataFrame([data.dict()])
        input_df_encoded = pd.get_dummies(input_df)
        input_df_encoded = input_df_encoded.reindex(columns=streaming_model_columns, fill_value=0)
        predicted_department = streaming_model.predict(input_df_encoded)[0]

        # --- Construct the FHIR Response ---
        return {
            "resourceType": "RiskAssessment", "status": "final",
            "subject": { "display": "Simulated ED Patient" },
            "occurrenceDateTime": datetime.now().isoformat(),
            "prediction": [
                {"outcome": {"text": f"Predicted Triage Category: {predicted_triage_number}"}},
                {"outcome": {"text": f"Predicted ED Department: {predicted_department}"}}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {e}")


# --- LIVE DATA & HOLIDAY ENDPOINTS (Refactored) ---

@app.get("/Organization/{org_id}/$live-status", tags=["Live Data"])
def get_live_ed_status(org_id: str):
    """
    Scrapes the live ED status for a specific organization (e.g., 'logan-hospital')
    and returns it as a FHIR MeasureReport.
    """
    page_url = f"https://openhospitals.health.qld.gov.au/facility/{org_id}"
    
    driver_path = "./chromedriver" # Assumes chromedriver is in the same folder
    service = Service(executable_path=driver_path)
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        driver.get(page_url)
        wait = WebDriverWait(driver, 20)
        waiting_xpath = "//h2[contains(text(), 'currently waiting')]/following-sibling::p"
        in_ed_xpath = "//h2[contains(text(), 'currently in ED')]/following-sibling::p"
        waiting_element = wait.until(EC.visibility_of_element_located((By.XPATH, waiting_xpath)))
        in_ed_element = wait.until(EC.visibility_of_element_located((By.XPATH, in_ed_xpath)))
        
        patients_waiting = extract_number_from_text(waiting_element.text)
        patients_in_ed = extract_number_from_text(in_ed_element.text)
        
        return {
            "resourceType": "MeasureReport", "status": "complete", "type": "summary",
            "measure": f"http://openhospitals.health.qld.gov.au/Measure/live-status/{org_id}",
            "date": datetime.now().isoformat(),
            "reportingOrganization": {"display": f"{org_id.replace('-', ' ').title()}"},
            "group": [
                {"code": {"text": "Patients Waiting for Treatment"}, "measureScore": {"value": patients_waiting}},
                {"code": {"text": "Total Patients in ED"}, "measureScore": {"value": patients_in_ed}}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not scrape live data: {e}")
    finally:
        driver.quit()


@app.get("/$holiday-status-today", tags=["Holiday Data"])
def get_holiday_status_for_today():
    """
    Checks if today is a QLD public holiday and returns a FHIR Flag resource.
    """
    today_str = date.today().strftime('%Y-%m-%d')
    holiday_name = holidays_dict.get(today_str)

    if holiday_name:
        return {
            "resourceType": "Flag", "status": "active",
            "code": {"text": holiday_name},
            "subject": {"reference": f"Date/{today_str}"}
        }
    else:
        return {"resourceType": "Flag", "status": "inactive", "subject": {"reference": f"Date/{today_str}"}}

@app.get("/cumulative-arrival-profile", tags=["Dashboard Visuals"])
def get_cumulative_arrival_profile():
    """
    Returns the CUMULATIVE arrival profile by hour and day.
    This is used for the intra-day forecast and the heatmap.
    """
    if arrival_profile_df is None:
        raise HTTPException(status_code=500, detail="Arrival profile (arrival_profile.csv) is not loaded.")
    
    return arrival_profile_df.to_dict()

@app.get("/hourly-arrival-profile", tags=["Dashboard Visuals"])
def get_hourly_arrival_profile():
    """
    Returns the HOURLY arrival profile (proportions) by hour and day.
    This is used for the detailed intra-day heatmap.
    """
    if hourly_profile_df is None:
        raise HTTPException(status_code=500, detail="Hourly arrival profile (hourly_arrival_profile.csv) is not loaded.")
    
    # Return as { 'Monday': { '0': 0.019, '1': 0.019, ... }, 'Tuesday': ... }
    return hourly_profile_df.to_dict()