import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  message: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, message }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-50 border-green-200';
    if (score >= 6) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getScoreBg(score)} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Match Analysis</h3>
        {score >= 7 ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <AlertCircle className="h-6 w-6 text-yellow-600" />
        )}
      </div>
      
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(score)} mb-2`}>
          {score.toFixed(1)}
        </div>
        <div className="text-sm text-gray-600">out of 10</div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${(score / 10) * 100}%` }}
        ></div>
      </div>

      <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
    </div>
  );
};

export default ScoreCard;