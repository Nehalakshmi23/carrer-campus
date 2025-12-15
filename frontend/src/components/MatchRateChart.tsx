import React from "react";

interface Props {
  score: number; // 0–100
}

const MatchRateChart: React.FC<Props> = ({ score }) => {
  const radius = 80;
  const stroke = 10;

  const normalized = Math.min(Math.max(score, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  const getColor = () => {
    if (normalized >= 70) return "#16a34a"; // green
    if (normalized >= 40) return "#facc15"; // yellow
    return "#dc2626"; // red
  };

  const getLabel = () => {
    if (normalized >= 70) return "Strong Match";
    if (normalized >= 40) return "Moderate Match";
    return "Low Match";
  };

  return (
    <svg width="200" height="200">
      <circle
        cx="100"
        cy="100"
        r={radius}
        stroke="#e5e7eb"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx="100"
        cy="100"
        r={radius}
        stroke={getColor()}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
      />
      <text
        x="100"
        y="95"
        textAnchor="middle"
        className="text-3xl font-bold fill-gray-900"
      >
        {Math.round(normalized)}
      </text>
      <text
        x="100"
        y="120"
        textAnchor="middle"
        className="text-sm fill-gray-500"
      >
        Overall Score
      </text>
      <text
        x="100"
        y="145"
        textAnchor="middle"
        className="text-sm font-semibold"
        fill={getColor()}
      >
        {getLabel()}
      </text>
    </svg>
  );
};

export default MatchRateChart;
