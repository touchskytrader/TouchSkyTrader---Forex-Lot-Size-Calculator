import React from 'react';
import { RiskLevel } from '../types';

interface RiskIndicatorProps {
  level: RiskLevel;
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ level }) => {
  let bgColorClass = 'bg-gray-400';
  let textColorClass = 'text-gray-800';
  let text = 'N/A';

  switch (level) {
    case RiskLevel.LOW:
      bgColorClass = 'bg-green-500';
      textColorClass = 'text-white';
      text = 'Low Risk';
      break;
    case RiskLevel.MEDIUM:
      bgColorClass = 'bg-yellow-500';
      textColorClass = 'text-gray-800';
      text = 'Medium Risk';
      break;
    case RiskLevel.HIGH:
      bgColorClass = 'bg-red-500';
      textColorClass = 'text-white';
      text = 'High Risk';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${bgColorClass} ${textColorClass}`}
    >
      {text}
    </span>
  );
};

export default RiskIndicator;