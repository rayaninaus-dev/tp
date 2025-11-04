import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, Activity, Bed, AlertTriangle, TrendingUp, TrendingDown, Calendar, CalendarCheck, BugPlay, Droplet, User, Thermometer, Wind, HeartPulse, Gauge, SmilePlus, Truck, BarChart2, X } from 'lucide-react';

// A small helper for the FHIR tag styling
const MedicalTag = ({ children, className = '' }) => (
  <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${className}`}>
    {children}
  </span>
);

// Your KPICard component (no changes needed here)
const KPICard = ({ title, value, icon: Icon, trend, color, subtitle, trendDirection, fhirTag }) => {
  const trendColorClass = trendDirection === 'down' ? 'text-red-500' : 'text-green-500';
  const TrendIcon = trendDirection === 'down' ? TrendingDown : TrendingUp;
  return (
    <div
      className='bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between min-h-[150px] hover:shadow-md transition-shadow duration-300'
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <span className="font-semibold text-gray-600">{title}</span>
        </div>
        {fhirTag && (
          <MedicalTag className="bg-slate-100 text-slate-500">
            {fhirTag}
          </MedicalTag>
        )}
      </div>
      <div className="my-2">
        <p className="text-4xl font-bold text-gray-800">{value}</p>
      </div>
      <div className="flex items-end justify-between text-sm h-5">
        {subtitle ? <p className="text-gray-500">{subtitle}</p> : <span />}
        {trend && (
          <div className={`flex items-center gap-1 font-medium ${trendColorClass}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================================================================
// Interactive card for Intra-Day Predictions
// --- UPDATED to include a button to open the heatmap modal ---
// ===================================================================
const IntraDayPredictorCard = ({ onPredict, prediction, setArrivalsInput, arrivalsInput, isLoading, error, onShowHeatmap }) => {
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setArrivalsInput(value);
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Intra-Day Arrival Forecast</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-grow w-full sm:w-auto">
          <label htmlFor="arrivals_so_far" className="block text-sm font-medium text-gray-600 mb-1">
            Arrivals So Far Today
          </label>
          <input
            type="text"
            id="arrivals_so_far"
            value={arrivalsInput}
            onChange={handleInputChange}
            placeholder="e.g., 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !arrivalsInput}
          className="w-full sm:w-auto mt-4 sm:mt-0 self-end px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Predicting...' : 'Predict Remainder'}
        </button>
      </form>
      {isLoading && <div className="mt-4 text-center text-gray-500">Loading forecast...</div>}
      {error && <div className="mt-4 text-center text-red-600 font-medium">Prediction failed: {error}</div>}
      {prediction && (
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <div>
              <p className="text-gray-600">Total Est. Arrivals:</p>
              <p className="font-bold text-indigo-700 text-2xl">{prediction.estimated_total_for_today}</p>
            </div>
            <div className="border-l-2 border-indigo-200 h-10 hidden sm:block"></div>
            <div>
              <p className="text-gray-600">Remaining Arrivals:</p>
              <p className="font-bold text-indigo-700 text-2xl">{prediction.remaining_arrivals_prediction}</p>
            </div>
            <button
              onClick={onShowHeatmap}
              className="sm:ml-auto px-3 py-2 bg-white text-indigo-600 border border-indigo-600 text-sm font-semibold rounded-md shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <BarChart2 className="w-4 h-4 inline-block mr-2" />
              Show Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// Form for Module 3 (Acuity/Streaming)
// ===================================================================
const RiskAssessmentForm = () => {
  const [formData, setFormData] = useState({
    age: 55, gender: 'M', transport: 'WALK IN', temp: 36.8, heart_rate: 80,
    resp_rate: 18, o2_sat: 98, systolic_bp: 120, diastolic_bp: 80, pain_level: 0
  });
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const currentHour = new Date().getHours();
      const response = await fetch('http://127.0.0.1:8000/Patient/$assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, hour_of_day: currentHour })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPrediction(data);
    } catch (e) {
      console.error("Failed to fetch risk assessment:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient Acuity & Department Predictor</h2>
      <p className="text-sm text-gray-500 mb-4">Simulate a new patient arrival by entering their initial information. The model will predict their likely triage category and the appropriate ED department. In a real implementation, this would be connected to a hospital backend service, automatically providing Predictions.</p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputGroup name="age" label="Age" value={formData.age} onChange={handleChange} icon={User} type="number" />
          <SelectGroup name="gender" label="Gender" value={formData.gender} onChange={handleChange} icon={Users} options={['M', 'F']} />
          <SelectGroup name="transport" label="Arrival Transport" value={formData.transport} onChange={handleChange} icon={Truck} options={['WALK IN', 'AMBULANCE', 'OTHER']} />
          <InputGroup name="pain_level" label="Pain (0-10)" value={formData.pain_level} onChange={handleChange} icon={SmilePlus} type="number" />
          <InputGroup name="temp" label="Temp (°C)" value={formData.temp} onChange={handleChange} icon={Thermometer} type="number" step="0.1" />
          <InputGroup name="heart_rate" label="Heart Rate (bpm)" value={formData.heart_rate} onChange={handleChange} icon={HeartPulse} type="number" />
          <InputGroup name="resp_rate" label="Resp. Rate" value={formData.resp_rate} onChange={handleChange} icon={Wind} type="number" />
          <InputGroup name="o2_sat" label="O2 Sat (%)" value={formData.o2_sat} onChange={handleChange} icon={Droplet} type="number" />
          <InputGroup name="systolic_bp" label="Systolic BP" value={formData.systolic_bp} onChange={handleChange} icon={Gauge} type="number" />
          <InputGroup name="diastolic_bp" label="Diastolic BP" value={formData.diastolic_bp} onChange={handleChange} icon={Gauge} type="number" />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto mt-6 px-4 py-2 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
        >
          {isLoading ? 'Assessing Risk...' : 'Assess Patient Risk'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600 font-medium">Prediction failed: {error}</div>}
      {prediction && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-md font-semibold text-gray-800 mb-3">FHIR RiskAssessment Result</h3>
          <div className="space-y-2">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-sm font-medium text-gray-500">Predicted Triage</p>
              <p className="text-lg font-bold text-purple-700">{prediction.prediction[0].outcome.text}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <p className="text-sm font-medium text-gray-500">Predicted Department</p>
              <p className="text-lg font-bold text-purple-700">{prediction.prediction[1].outcome.text}</p>
            </div>
            <pre className="text-xs p-2 bg-gray-100 rounded overflow-auto mt-4">{JSON.stringify(prediction, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components for the form
const InputGroup = ({ name, label, value, onChange, icon: Icon, type = "text", step = "1" }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="w-5 h-5 text-gray-400" /></span>
      <input
        type={type} id={name} name={name} value={value} onChange={onChange} step={step}
        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  </div>
);
const SelectGroup = ({ name, label, value, onChange, icon: Icon, options }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="w-5 h-5 text-gray-400" /></span>
      <select
        id={name} name={name} value={value} onChange={onChange}
        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  </div>
);

// ===================================================================
// Heatmap Modal for Remaining Arrivals
// --- UPDATED to fetch HOURLY data and calculate absolute numbers ---
// ===================================================================
const RemainingPatientHeatmap = ({ prediction, onClose }) => {
  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the hourly profile when the component mounts
  useEffect(() => {
    const fetchHeatmapData = async () => {
      setIsLoading(true);
      try {
        // Call the new endpoint for HOURLY proportions
        const response = await fetch('http://127.0.0.1:8000/hourly-arrival-profile');
        if (!response.ok) throw new Error('Failed to fetch heatmap data');
        const hourlyProfile = await response.json();

        // Calculate absolute predicted arrivals for each slot
        const absoluteData = {};
        const total = prediction.estimated_total_for_today;

        for (const day in hourlyProfile) {
          absoluteData[day] = Object.fromEntries(
            Object.entries(hourlyProfile[day]).map(([hour, value]) => [hour, total * value])
          );
        }
        setHeatmapData(absoluteData);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHeatmapData();
  }, [prediction.estimated_total_for_today]); // Re-run if the total prediction changes

  // Get current day and hour for styling
  const currentDayIndex = new Date().getDay(); // Sunday=0, Monday=1, etc.
  const heatmapDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1; // Re-index to Monday=0
  const currentHour = new Date().getHours();

  // Define heatmap colors and layout
  const getColor = (value, isPast) => {
    if (isPast) return 'rgb(240, 240, 240, 0.5)'; // Light gray for past hours
    const intensity = Math.min(Math.max(value, 0), 20) / 20; // Normalize based on 20 as a "high" hourly value
    const g = Math.round(255 * (1 - intensity));
    const r = Math.round(255 * intensity);
    return `rgb(${r}, ${g}, 50, ${intensity * 0.7 + 0.3})`; // Red-Green scale
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 m-4 w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Hourly Arrival Breakdown (Today)</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Predicted hourly arrivals for today, based on an estimated total of <span className="font-bold">{prediction.estimated_total_for_today}</span> patients.
          <span className="font-semibold text-gray-700"> Shaded cells represent hours that have already passed.</span>
        </p>
        {isLoading ? (
          <div className="text-center text-gray-500">Loading heatmap data...</div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: "700px" }}>
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-1">
                <div className="p-2 font-bold text-gray-600 text-sm">Hour</div>
                {days.map((day, dayIdx) => (
                  <div key={day} className={`p-2 font-bold text-sm text-center ${dayIdx === heatmapDayIndex ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              {/* Data Rows */}
              {hours.map(hour => {
                const isPastHour = hour < currentHour;
                return (
                  <div key={hour} className="grid grid-cols-8 gap-1 items-center">
                    <div className="p-2 font-mono text-gray-600 text-sm">{`${String(hour).padStart(2, '0')}:00`}</div>
                    {days.map((day, dayIdx) => {
                      const isTodayCell = dayIdx === heatmapDayIndex;
                      const isCellInPast = isTodayCell && isPastHour;
                      const value = heatmapData?.[day]?.[String(hour)] || 0;

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`h-10 rounded text-xs font-semibold flex items-center justify-center ${isCellInPast ? 'text-gray-400' : 'text-black/80'}`}
                          style={{ backgroundColor: getColor(value, isCellInPast) }}
                          title={isCellInPast ? "Past" : `~${value.toFixed(1)} predicted arrivals`}
                        >
                          {value.toFixed(1)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ===================================================================
// THE KPICards COMPONENT NOW CONTAINS ALL DATA FETCHING LOGIC
// ===================================================================
const KPICards = () => {
  const [kpis, setKpis] = useState({
    waitingPatients: 0,
    averageWaitTime: 0,
    holidayInfo: { isHoliday: false, name: 'Normal Day' },
    fluRiskInfo: { level: 'Low', value: 0, average: 0 },
    bedOccupancy: 85,
    criticalAlerts: 3
  });
  const [isLoading, setIsLoading] = useState({ liveStatus: true, holiday: true, flu: true });
  const [error, setError] = useState(null);

  const [arrivalsInput, setArrivalsInput] = useState('');
  const [intraDayPrediction, setIntraDayPrediction] = useState(null);
  const [isIntraDayLoading, setIsIntraDayLoading] = useState(false);
  const [intraDayError, setIntraDayError] = useState(null);

  const [showHeatmapModal, setShowHeatmapModal] = useState(false);

  const handleIntraDayForecast = async () => {
    if (!arrivalsInput) return;
    setIsIntraDayLoading(true);
    setIntraDayError(null);
    setIntraDayPrediction(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/Organization/logan-hospital/$predict-remaining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivals_so_far: parseInt(arrivalsInput, 10) })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setIntraDayPrediction(data);
    } catch (e) {
      console.error("Failed to fetch intra-day forecast:", e);
      setIntraDayError(e.message);
    } finally {
      setIsIntraDayLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/Organization/logan-hospital/$live-status');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const waiting = data.group.find(g => g.code.text === "Patients Waiting for Treatment")?.measureScore?.value || 0;
      const waitTime = data.group.find(g => g.code.text === "Median Waiting Time (minutes)")?.measureScore?.value || 0;
      setKpis(prev => ({ ...prev, waitingPatients: waiting, averageWaitTime: waitTime }));
    } catch (e) {
      console.error("Failed to fetch live ED status:", e);
      setError("Could not load live data.");
    } finally {
      setIsLoading(prev => ({ ...prev, liveStatus: false }));
    }
  };

  const fetchHolidayStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/$holiday-status-today');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.status === 'active') {
        setKpis(prev => ({ ...prev, holidayInfo: { isHoliday: true, name: data.code.text } }));
      } else {
        setKpis(prev => ({ ...prev, holidayInfo: { isHoliday: false, name: 'Normal Day' } }));
      }
    } catch (e) {
      console.error("Failed to fetch holiday status:", e);
    } finally {
      setIsLoading(prev => ({ ...prev, holiday: false }));
    }
  };

  const fetchFluForecast = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/Observation/$flu-forecast-today');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const predictedValue = data.valueQuantity?.value || 0;
      const riskLevel = data.interpretation?.[0]?.coding?.[0]?.display || 'N/A';
      const avgText = data.referenceRange?.[0]?.text || '';
      const avgMatch = avgText.match(/\d+/);
      const historicalAverage = avgMatch ? parseInt(avgMatch[0], 10) : 0;
      setKpis(prev => ({ ...prev, fluRiskInfo: { level: riskLevel, value: predictedValue, average: historicalAverage } }));
    } catch (e) {
      console.error("Failed to fetch flu forecast:", e);
    } finally {
      setIsLoading(prev => ({ ...prev, flu: false }));
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    fetchHolidayStatus();
    fetchFluForecast();
    const intervalId = setInterval(fetchLiveStatus, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const getFluRiskColor = () => {
    switch (kpis.fluRiskInfo?.level) {
      case 'High': return 'text-red-500';
      case 'Moderate': return 'text-orange-500';
      default: return 'text-green-500';
    }
  };

  const kpiItems = [
    {
      title: 'Waiting for Treatment',
      value: isLoading.liveStatus ? '...' : kpis.waitingPatients,
      icon: Clock,
      color: 'text-orange-500',
      subtitle: 'Live queue',
      fhirTag: 'MeasureReport'
    },
    {
      title: 'Median Wait Time',
      value: isLoading.liveStatus ? '...' : `${kpis.averageWaitTime}m`,
      icon: Activity,
      color: 'text-purple-500',
      subtitle: 'Live data',
      fhirTag: 'MeasureReport',
    },
    {
      title: 'Holiday Status',
      value: isLoading.holiday ? '...' : kpis.holidayInfo?.name || 'Normal Day',
      icon: kpis.holidayInfo?.isHoliday ? CalendarCheck : Calendar,
      color: kpis.holidayInfo?.isHoliday ? 'text-teal-500' : 'text-gray-500',
      subtitle: 'QLD Public Holiday',
      fhirTag: 'Flag'
    },
    {
      title: "Today's Flu Risk",
      value: isLoading.flu ? '...' : kpis.fluRiskInfo?.level || 'N/A',
      icon: BugPlay,
      color: getFluRiskColor(),
      subtitle: isLoading.flu
        ? 'Loading...'
        : `Pred: ${kpis.fluRiskInfo?.value ?? '...'} vs Avg: ${kpis.fluRiskInfo?.average ?? '...'}`,
      fhirTag: 'Observation'
    },
    {
      title: 'Bed Occupancy',
      value: `${kpis.bedOccupancy}%`,
      icon: Bed,
      color: 'text-green-500',
      subtitle: 'System-wide (Static)',
      fhirTag: 'Location'
    },
    {
      title: 'Critical Alerts',
      value: `${kpis.criticalAlerts}`,
      icon: AlertTriangle,
      color: 'text-red-500',
      subtitle: 'Requires attention (Static)',
      fhirTag: 'Flag'
    }
  ];

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {kpiItems.map((item, index) => (
          <KPICard key={index} {...item} />
        ))}
      </div>

      <IntraDayPredictorCard
        onPredict={handleIntraDayForecast}
        prediction={intraDayPrediction}
        setArrivalsInput={setArrivalsInput}
        arrivalsInput={arrivalsInput}
        isLoading={isIntraDayLoading}
        error={intraDayError}
        onShowHeatmap={() => setShowHeatmapModal(true)}
      />

      <RiskAssessmentForm />

      {/* --- THIS IS THE FIX: The component name was misspelled --- */}
      {showHeatmapModal && intraDayPrediction && (
        <RemainingPatientHeatmap
          prediction={intraDayPrediction}
          onClose={() => setShowHeatmapModal(false)}
        />
      )}
    </div>
  );
};

export default KPICards;

