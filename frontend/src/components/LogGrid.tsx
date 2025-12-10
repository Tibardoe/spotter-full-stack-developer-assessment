import React from "react";
import { DailyLog, DutyStatus } from "../types";
import { STATUS_LABELS } from "../constants";
import { startOfDay, differenceInMinutes } from "date-fns";

interface Props {
  log: DailyLog;
}

export const LogGrid: React.FC<Props> = ({ log }) => {
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 40, bottom: 30, left: 100 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const rowHeight = graphHeight / 4;
  const getX = (hour: number) => padding.left + (hour / 24) * graphWidth;

  const getY = (status: DutyStatus) => {
    const map = {
      [DutyStatus.OFF_DUTY]: 0,
      [DutyStatus.SLEEPER]: 1,
      [DutyStatus.DRIVING]: 2,
      [DutyStatus.ON_DUTY]: 3,
    };
    return padding.top + map[status] * rowHeight + rowHeight / 2;
  };

  let pathD = "";
  let lastX = getX(0);
  let lastY = getY(
    log.events.length > 0 ? log.events[0].status : DutyStatus.OFF_DUTY
  );

  pathD += `M ${lastX} ${lastY}`;
  const dayStart = startOfDay(new Date(log.date + "T00:00:00"));

  log.events.forEach((event) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    const startDiff = differenceInMinutes(eventStart, dayStart) / 60;
    const endDiff = differenceInMinutes(eventEnd, dayStart) / 60;

    const xStart = getX(Math.max(0, startDiff));
    const xEnd = getX(Math.min(24, endDiff));
    const y = getY(event.status);

    if (y !== lastY) {
      pathD += ` V ${y}`;
    }

    pathD += ` H ${xEnd}`;
    lastX = xEnd;
    lastY = y;
  });

  if (lastX < getX(24)) {
    pathD += ` H ${getX(24)}`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[600px] border border-slate-300 bg-white"
      >
        {Array.from({ length: 25 }).map((_, i) => (
          <line
            key={i}
            x1={getX(i)}
            y1={padding.top}
            x2={getX(i)}
            y2={height - padding.bottom}
            stroke="#e2e8f0"
            strokeWidth={i % 6 === 0 ? 2 : 1}
          />
        ))}

        {Object.keys(STATUS_LABELS).map((status, i) => (
          <g key={status}>
            <line
              x1={padding.left}
              y1={padding.top + i * rowHeight + rowHeight / 2}
              x2={width - padding.right}
              y2={padding.top + i * rowHeight + rowHeight / 2}
              stroke="#e2e8f0"
            />
            <text
              x={padding.left - 10}
              y={padding.top + i * rowHeight + rowHeight / 2 + 4}
              textAnchor="end"
              className="text-xs fill-slate-500 font-medium"
              style={{ fontSize: "10px" }}
            >
              {STATUS_LABELS[status as DutyStatus].split(" ")[0]}
            </text>
          </g>
        ))}

        {Array.from({ length: 25 }).map((_, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - 5}
            textAnchor="middle"
            className="text-[10px] fill-slate-400"
          >
            {i}
          </text>
        ))}

        <path d={pathD} fill="none" stroke="#1e293b" strokeWidth="2" />
      </svg>
    </div>
  );
};
