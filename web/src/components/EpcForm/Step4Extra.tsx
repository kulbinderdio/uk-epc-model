"use client";

import { useState } from "react";
import type { PropertyInput } from "@/types/epc";
import { SelectField, NumberField, RadioField, FormNav } from "./FormField";
import { HEAT_LOSS_CORRIDOR_OPTIONS } from "@/lib/formOptions";

interface Props {
  data: Partial<PropertyInput>;
  isFlat: boolean;
  onNext: (d: Partial<PropertyInput>) => void;
  onBack: () => void;
  isLoading: boolean;
}

const YES_NO = [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }];

export default function Step4Extra({ data, isFlat, onNext, onBack, isLoading }: Props) {
  const [local, setLocal] = useState<Partial<PropertyInput>>(data);
  const set = (k: keyof PropertyInput) => (v: unknown) => setLocal((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isFlat && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Flat-specific details</h3>
          <NumberField
            label="Floor level"
            id="floor_level"
            value={local.floor_level}
            onChange={set("floor_level")}
            min={-1}
            max={99}
            placeholder="e.g. 2"
            help={
              <div className="space-y-1">
                <p>Which floor your flat is on.</p>
                <ul className="mt-1 space-y-0.5 text-gray-600">
                  <li><strong>-1</strong> — basement/lower ground floor</li>
                  <li><strong>0</strong> — ground floor</li>
                  <li><strong>1</strong> — first floor above ground</li>
                  <li><strong>2</strong> — second floor, etc.</li>
                </ul>
                <p className="text-gray-500 mt-1">Ground floor flats have heat loss through the floor; top floor flats lose heat through the ceiling/roof. Mid-floor flats have the least exposure.</p>
              </div>
            }
          />
          <NumberField
            label="Number of storeys in the block"
            id="flat_storey_count"
            value={local.flat_storey_count}
            onChange={set("flat_storey_count")}
            min={1}
            max={100}
            placeholder="e.g. 6"
            help={<p>The total number of storeys in the building your flat is in (not just the floors above yours). Count from the lowest floor to the highest — include basement levels if present.</p>}
          />
          <RadioField
            label="Is this a top-floor flat?"
            id="flat_top_storey"
            value={local.flat_top_storey ?? ""}
            onChange={set("flat_top_storey")}
            options={YES_NO}
            help={<p>Is your flat on the top floor of the block? Top-floor flats have a ceiling/roof above them which loses heat, similar to the roof of a house. This is an important factor in calculating heat loss.</p>}
          />
          <SelectField
            label="Communal corridor type"
            id="heat_loss_corridor"
            value={local.heat_loss_corridor ?? ""}
            onChange={set("heat_loss_corridor")}
            options={HEAT_LOSS_CORRIDOR_OPTIONS}
            placeholder="No corridor"
            help={
              <div className="space-y-1">
                <p>Does your flat open onto a communal corridor?</p>
                <ul className="mt-1 space-y-0.5 text-gray-600">
                  <li><strong>No corridor</strong> — your front door opens directly to outside or a stairwell with no enclosed corridor.</li>
                  <li><strong>Heated corridor</strong> — the corridor is warmed (e.g., by communal heating). Less heat loss from your flat.</li>
                  <li><strong>Unheated corridor</strong> — the corridor is not heated. Creates a cold zone adjacent to your flat&apos;s front wall.</li>
                </ul>
              </div>
            }
          />
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-sm text-gray-600">
          All fields above are optional — the more you fill in, the more accurate the prediction.
          Click <strong>Get EPC Rating</strong> when you&apos;re ready.
        </p>
      </div>

      <FormNav onBack={onBack} isLast isLoading={isLoading} />
    </form>
  );
}
