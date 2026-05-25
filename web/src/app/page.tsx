"use client";

import { useState } from "react";
import EpcForm from "@/components/EpcForm";
import EpcResult from "@/components/EpcResult";
import { predictEpc, getRecommendations } from "@/lib/api";
import type { PropertyInput, PredictionResponse, RecommendationItem } from "@/types/epc";

type State =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "result"; prediction: PredictionResponse; recommendations: RecommendationItem[] }
  | { kind: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ kind: "form" });

  async function handleSubmit(data: PropertyInput) {
    setState({ kind: "loading" });
    try {
      const [prediction, recsResponse] = await Promise.all([
        predictEpc(data),
        getRecommendations(data),
      ]);
      setState({
        kind: "result",
        prediction,
        recommendations: recsResponse.recommendations,
      });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            EPC Rating Predictor
          </h1>
          <p className="text-gray-500 text-base">
            Enter your property details to get an estimated Energy Performance Certificate rating,
            trained on 19 million EPC assessments covering properties across England and Wales.
          </p>
        </div>

        {/* Research disclaimer */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">For research and estimation purposes only</p>
          <p className="text-amber-800 leading-relaxed">
            This tool uses a machine learning model and <strong>cannot replace an official EPC assessment</strong>.
            EPC ratings are legally required for selling or renting a property and must be
            issued by an accredited energy assessor.{" "}
            The model predicts the correct letter grade approximately 77% of the time on held-out test data;
            properties near grade boundaries carry additional uncertainty.
            Use this tool to explore your likely rating and plan improvements — do not rely on it for legal or financial decisions.
          </p>
        </div>

        {state.kind === "form" && (
          <EpcForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Predicting EPC rating...</p>
          </div>
        )}

        {state.kind === "result" && (
          <EpcResult
            prediction={state.prediction}
            recommendations={state.recommendations}
            onReset={() => setState({ kind: "form" })}
          />
        )}

        {state.kind === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium mb-2">Something went wrong</p>
            <p className="text-red-600 text-sm mb-4">{state.message}</p>
            <button
              onClick={() => setState({ kind: "form" })}
              className="text-sm text-red-600 underline hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
