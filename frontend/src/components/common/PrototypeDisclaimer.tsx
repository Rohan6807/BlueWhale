import React, { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const PrototypeDisclaimer: React.FC<Props> = ({ compact = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && compact) return null;

  if (compact) {
    return (
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>RESEARCH PROTOTYPE:</strong> CardioLens AI is not a medical device. Never use for emergency diagnosis or critical care.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:text-amber-900 p-0.5 rounded"
          title="Dismiss banner"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 my-4 text-sm text-amber-950 flex items-start gap-3 shadow-xs">
      <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-amber-900 flex items-center gap-2">
          Healthcare Research Prototype Notice
          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Non-Diagnostic</span>
        </h4>
        <p className="text-xs leading-relaxed text-amber-800/90">
          CardioLens AI is an exploratory research demonstrator for wearable physiological trend awareness and simulated emergency response.
          It is <strong>not an FDA-cleared or CE-marked medical device</strong>. Basic wearable sensors cannot diagnose heart disease, predict cardiac arrest, or guarantee safety.
          If you experience chest pain, severe shortness of breath, sudden numbness, or a suspected medical emergency, call <strong>911</strong> or your local emergency service immediately.
        </p>
      </div>
    </div>
  );
};
