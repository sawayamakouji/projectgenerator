import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div>
      {label && <p className="text-sm text-gray-500 mb-1">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
          role="progressbar"
          aria-valuenow={safeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
           <span className="sr-only">{safeProgress}% Complete</span>
        </div>
      </div>
      <p className="text-right text-xs text-gray-600 mt-1 font-mono">{safeProgress}%</p>
    </div>
  );
};