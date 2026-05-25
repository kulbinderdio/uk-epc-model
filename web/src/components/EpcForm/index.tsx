"use client";

import { useState } from "react";
import type { PropertyInput } from "@/types/epc";
import Step1Basics from "./Step1Basics";
import Step2Envelope from "./Step2Envelope";
import Step3Heating from "./Step3Heating";
import Step4Extra from "./Step4Extra";

const STEPS = ["Property Basics", "Building Envelope", "Heating & Energy", "Additional Details"];

interface Props {
  onSubmit: (data: PropertyInput) => void;
  isLoading: boolean;
}

export default function EpcForm({ onSubmit, isLoading }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<PropertyInput>>({});

  function merge(partial: Partial<PropertyInput>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function handleNext(partial: Partial<PropertyInput>) {
    const updated = { ...data, ...partial };
    setData(updated);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onSubmit(updated as PropertyInput);
    }
  }

  const isFlat = data.property_type === "Flat" || data.property_type === "Maisonette";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center mb-8 gap-1">
        {STEPS.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                ${i < step ? "bg-green-500 border-green-500 text-white"
                  : i === step ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-400"}`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-blue-600 font-medium" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">{STEPS[step]}</h2>

        {step === 0 && <Step1Basics data={data} onNext={handleNext} />}
        {step === 1 && <Step2Envelope data={data} onNext={handleNext} onBack={() => setStep(0)} />}
        {step === 2 && <Step3Heating data={data} onNext={handleNext} onBack={() => setStep(1)} />}
        {step === 3 && (
          <Step4Extra
            data={data}
            isFlat={isFlat}
            onNext={handleNext}
            onBack={() => setStep(2)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
