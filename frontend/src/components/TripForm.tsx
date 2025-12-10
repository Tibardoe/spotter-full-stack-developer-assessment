import React from "react";
import { TripInputs } from "../types";
import { CITY_DB } from "../constants";

interface Props {
  inputs: TripInputs;
  setInputs: React.Dispatch<React.SetStateAction<TripInputs>>;
  onCalculate: () => void;
}

const CityDataList = () => (
  <datalist id="cities">
    {Object.keys(CITY_DB).map((city) => (
      <option key={city} value={city} />
    ))}
  </datalist>
);

export const TripForm: React.FC<Props> = ({
  inputs,
  setInputs,
  onCalculate,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setInputs((prev) => ({
      ...prev,
      [name]: name === "cycleUsed" ? (value === "" ? 0 : Number(value)) : value,
    }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Trip Details</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Current Location
          </label>
          <input
            list="cities"
            name="currentLocation"
            value={inputs.currentLocation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. New York, NY"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Pickup Location
          </label>
          <input
            list="cities"
            name="pickupLocation"
            value={inputs.pickupLocation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Chicago, IL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Dropoff Location
          </label>
          <input
            list="cities"
            name="dropoffLocation"
            value={inputs.dropoffLocation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Los Angeles, CA"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Current Cycle (Hrs)
            </label>
            <input
              type="number"
              name="cycleUsed"
              value={inputs.cycleUsed}
              onChange={handleChange}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Start Date
            </label>
            <input
              type="datetime-local"
              name="startDateTime"
              value={inputs.startDateTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <CityDataList />

        <button
          onClick={onCalculate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2"
        >
          Generate Plan & Logs
        </button>
      </div>
    </div>
  );
};
