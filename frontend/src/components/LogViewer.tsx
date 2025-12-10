import React from "react";
import { DailyLog, DutyStatus } from "../types";
import { LogGrid } from "./LogGrid";
import { format } from "date-fns";

interface Props {
  log: DailyLog;
}

export const LogViewer: React.FC<Props> = ({ log }) => {
  // Helper to safely format numbers, preventing crashes if data is malformed
  const safeFixed = (val: number | undefined | string) => {
    const num = Number(val);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 print:border-none print:shadow-none">
      {/* Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm border-b pb-4">
        <div>
          <span className="block text-slate-500 text-xs uppercase">Date</span>
          <span className="font-mono font-bold">
            {format(new Date(log.date + "T00:00:00"), "MM/dd/yyyy")}
          </span>
        </div>
        <div>
          <span className="block text-slate-500 text-xs uppercase">
            Total Miles
          </span>
          <span className="font-mono">{Math.round(log.totalMiles)}</span>
        </div>
        <div>
          <span className="block text-slate-500 text-xs uppercase">
            Truck #
          </span>
          <span className="font-mono">{log.truckNumber}</span>
        </div>
        <div>
          <span className="block text-slate-500 text-xs uppercase">
            Carrier
          </span>
          <span className="font-mono truncate">{log.carrier}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="mb-6">
        <h4 className="text-xs uppercase text-slate-500 mb-2">24-Hour Grid</h4>
        <LogGrid log={log} />
      </div>

      {/* Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-xs uppercase text-slate-500 mb-2 font-bold">
            Remarks & Locations
          </h4>
          <ul className="text-xs space-y-1 font-mono max-h-40 overflow-y-auto">
            {log.events.map((evt, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-slate-400 w-12">
                  {format(new Date(evt.startTime), "HH:mm")}
                </span>
                <span className="font-bold w-6 text-center">{evt.status}</span>
                <span className="text-slate-700">{evt.location}</span>
                {evt.remarks && (
                  <span className="text-slate-500 italic">- {evt.remarks}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Recap */}
        <div>
          <h4 className="text-xs uppercase text-slate-500 mb-2 font-bold">
            Recap
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>Driving Hours:</span>
              <span className="font-mono font-bold">
                {safeFixed(log.totalHours[DutyStatus.DRIVING])}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>On Duty (Not Driving):</span>
              <span className="font-mono font-bold">
                {safeFixed(log.totalHours[DutyStatus.ON_DUTY].toFixed(2))}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>Cycle Used (Start):</span>
              <span className="font-mono text-slate-600">
                {safeFixed(log.cycleUsedStart.toFixed(2))}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span>Cycle Used (End):</span>
              <span className="font-mono text-slate-600">
                {safeFixed(log.cycleUsedEnd.toFixed(2))}
              </span>
            </div>
            <div className="col-span-2 pt-2">
              <div className="border-t-2 border-slate-800 pt-2 flex justify-between">
                <span className="font-bold">Total Duty Hours Today:</span>
                <span className="font-bold font-mono">
                  {safeFixed(
                    (
                      log.totalHours[DutyStatus.DRIVING] +
                      log.totalHours[DutyStatus.ON_DUTY]
                    ).toFixed(2)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Line */}
      <div className="mt-8 pt-8 border-t border-slate-300 flex justify-between items-end">
        <div className="w-1/2">
          <div className="border-b border-black h-8"></div>
          <p className="text-xs text-slate-500 mt-1">Driver's Signature</p>
        </div>
      </div>
    </div>
  );
};
