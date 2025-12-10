"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { TripForm } from "../components/TripForm";
import { LogViewer } from "../components/LogViewer";
import { TripInputs, SimulationResult } from "@/src/types";
import { generateTripLogs } from "@/src/utils/logHelper";
import { Truck, FileText, MapIcon } from "lucide-react";

const MapDisplay = dynamic(
  () => import("../components/MapDisplay").then((mod) => mod.MapDisplay),
  {
    ssr: false,
    loading: () => <p>Loading Map...</p>,
  }
);

export default function Home() {
  const [inputs, setInputs] = useState<TripInputs>({
    currentLocation: "New York, NY",
    pickupLocation: "Chicago, IL",
    dropoffLocation: "Los Angeles, CA",
    cycleUsed: 10,
    startDateTime: new Date().toISOString().slice(0, 16),
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const handleCalculate = () => {
    const result = generateTripLogs(inputs);
    setSimulation(result);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
        <Truck className="h-6 w-6 text-blue-400" />
        <h1 className="text-xl font-bold tracking-tight">
          HOS Trip Planner & ELD
        </h1>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-1 space-y-6">
            <TripForm
              inputs={inputs}
              setInputs={setInputs}
              onCalculate={handleCalculate}
            />

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Instructions
              </h3>
              <p className="mb-2">
                Enter your route details. The system supports major US cities
                for the simulation (e.g., New York, NY; Chicago, IL; Los
                Angeles, CA).
              </p>
              <p>The planner will automatically insert:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1 text-blue-700">
                <li>30-minute breaks (after 8h driving)</li>
                <li>10-hour sleeper splits (daily limit)</li>
                <li>Fuel stops (every 1,000 miles)</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-2 space-y-8">
            {simulation ? (
              <>
                {/* Map Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-bold text-slate-800">
                      Route Visualization
                    </h2>
                  </div>
                  <MapDisplay
                    routePath={simulation.routePath}
                    stops={simulation.stops}
                  />
                </section>

                {/* Logs Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-bold text-slate-800">
                      Generated Daily Logs ({simulation.logs.length})
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {simulation.logs.map((log) => (
                      <LogViewer key={log.date} log={log} />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-12">
                <Truck className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg">
                  Enter trip details and click Generate to view Route and Logs.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
