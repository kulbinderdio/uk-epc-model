"use client";

import type { PredictionResponse, RecommendationItem } from "@/types/epc";

const GRADE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "bg-[#009900]",  text: "text-white", border: "border-[#009900]",  label: "92-100" },
  B: { bg: "bg-[#44dd00]",  text: "text-white", border: "border-[#44dd00]",  label: "81-91" },
  C: { bg: "bg-[#aade00]",  text: "text-gray-800", border: "border-[#aade00]", label: "69-80" },
  D: { bg: "bg-[#eecc00]",  text: "text-gray-800", border: "border-[#eecc00]", label: "55-68" },
  E: { bg: "bg-[#ffaa00]",  text: "text-gray-800", border: "border-[#ffaa00]", label: "39-54" },
  F: { bg: "bg-[#ff6600]",  text: "text-white", border: "border-[#ff6600]",  label: "21-38" },
  G: { bg: "bg-[#dd0000]",  text: "text-white", border: "border-[#dd0000]",  label: "1-20" },
};

interface Props {
  prediction: PredictionResponse;
  recommendations: RecommendationItem[];
  onReset: () => void;
}

export default function EpcResult({ prediction, recommendations, onReset }: Props) {
  const cfg = GRADE_CONFIG[prediction.letter_grade] ?? GRADE_CONFIG["G"];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Main certificate card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white">Energy Performance Certificate</h2>
          <p className="text-gray-400 text-sm">Predicted rating based on property characteristics</p>
        </div>

        {/* Grade scale */}
        <div className="px-6 py-6">
          <div className="flex flex-col gap-1.5">
            {Object.entries(GRADE_CONFIG).map(([grade, c]) => {
              const isCurrent = grade === prediction.letter_grade;
              return (
                <div
                  key={grade}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 transition-all ${
                    isCurrent ? `${c.bg} ${c.text} shadow-md scale-[1.02]` : "bg-gray-50"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
                    isCurrent ? `border-white/40 ${c.text}` : `${c.border} ${c.text} bg-white`
                  }`}>
                    {grade}
                  </span>
                  <span className={`text-sm ${isCurrent ? c.text : "text-gray-500"}`}>{c.label}</span>
                  {isCurrent && (
                    <span className={`ml-auto text-sm font-semibold ${c.text}`}>
                      Score: {prediction.efficiency_score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Estimated score range:{" "}
              <strong>{prediction.score_low}–{prediction.score_high}</strong>
              {prediction.grade_low !== prediction.grade_high && (
                <span className="ml-1 text-gray-500">(could be {prediction.grade_low}–{prediction.grade_high})</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Recommended Improvements</h3>
            <p className="text-sm text-gray-500">Common upgrades for similar properties at this rating</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recommendations.map((rec, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{rec.improvement_summary ?? `Improvement ${rec.improvement_id}`}</p>
                </div>
                {rec.median_cost_estimate != null && (
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    ~£{Math.round(rec.median_cost_estimate).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
      >
        ← Assess another property
      </button>

      <p className="text-xs text-center text-gray-400 px-4">
        Estimated rating only — for research purposes. Official EPCs require an accredited assessor.
      </p>
    </div>
  );
}
