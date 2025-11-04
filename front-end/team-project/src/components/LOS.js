import React from 'react';

const LOS = ({ losStats }) => {
  if (!losStats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
        <p>No LOS data available.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Length of Stay (LOS)</h2>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Average LOS</p>
          <p className="text-2xl font-bold text-blue-700">{losStats.average} h</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Median LOS</p>
          <p className="text-2xl font-bold text-blue-700">{losStats.median} h</p>
        </div>
      </div>
    </div>
  );
};

export default LOS;
