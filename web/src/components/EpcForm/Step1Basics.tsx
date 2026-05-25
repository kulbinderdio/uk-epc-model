"use client";

import { useState } from "react";
import type { PropertyInput } from "@/types/epc";
import { SelectField, NumberField, FormNav } from "./FormField";
import { BuiltFormDiagram } from "./Diagrams";
import { PROPERTY_TYPES, BUILT_FORMS, AGE_BANDS, TENURE_OPTIONS } from "@/lib/formOptions";

interface Props {
  data: Partial<PropertyInput>;
  onNext: (d: Partial<PropertyInput>) => void;
}

export default function Step1Basics({ data, onNext }: Props) {
  const [local, setLocal] = useState<Partial<PropertyInput>>(data);
  const set = (k: keyof PropertyInput) => (v: unknown) => setLocal((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SelectField
        label="Property type"
        id="property_type"
        value={local.property_type ?? ""}
        onChange={set("property_type")}
        options={PROPERTY_TYPES}
        required
        help={
          <div className="space-y-1">
            <p><strong>House</strong> — a separate building not split into flats.</p>
            <p><strong>Flat</strong> — a self-contained dwelling within a larger building.</p>
            <p><strong>Bungalow</strong> — a single-storey house.</p>
            <p><strong>Maisonette</strong> — a flat spread over two floors, usually with its own entrance.</p>
            <p><strong>Park home</strong> — a mobile or static home on a permanent site.</p>
          </div>
        }
      />
      <SelectField
        label="Built form"
        id="built_form"
        value={local.built_form ?? ""}
        onChange={set("built_form")}
        options={BUILT_FORMS}
        required
        help={
          <div>
            <p className="mb-2">How your property is attached to neighbouring buildings. Shared walls lose heat to neighbours (less than to outside air, but still matters).</p>
            <BuiltFormDiagram />
            <p className="mt-1"><strong>Enclosed variants</strong> — also have a shared party wall above or below (common in converted flats or some terraced houses with an archway).</p>
          </div>
        }
      />
      <SelectField
        label="Construction age band"
        id="construction_age_band"
        value={local.construction_age_band ?? ""}
        onChange={set("construction_age_band")}
        options={AGE_BANDS}
        help={
          <div className="space-y-1">
            <p>When the property was <strong>originally built</strong> — not when it was last extended or renovated.</p>
            <p>This is one of the most important fields. The age band determines the likely wall construction type, original insulation levels, and typical heating systems.</p>
            <p className="mt-1 text-gray-500">If you don&apos;t know the exact year, check the Land Registry title register, mortgage valuation report, or ask the estate agent.</p>
          </div>
        }
      />
      <NumberField
        label="Total floor area"
        id="total_floor_area"
        value={local.total_floor_area}
        onChange={set("total_floor_area")}
        unit="m²"
        min={10}
        max={2000}
        step={0.5}
        required
        help={
          <div className="space-y-1">
            <p>The total internal floor area across <strong>all floors</strong>, measured in square metres.</p>
            <p>Include: all habitable rooms, kitchen, hallways, bathrooms, built-in cupboards.</p>
            <p>Exclude: garages (unless heated and used as living space), outbuildings.</p>
            <p className="mt-1 text-gray-500">To estimate: measure each room&apos;s length × width and add them all together. An average 3-bed semi is roughly 85–95 m².</p>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Habitable rooms"
          id="number_habitable_rooms"
          value={local.number_habitable_rooms}
          onChange={set("number_habitable_rooms")}
          min={1}
          max={30}
          placeholder="e.g. 5"
          help={
            <div className="space-y-1">
              <p>Rooms used for <strong>living or sleeping</strong>.</p>
              <p className="text-green-700">✓ Count: bedrooms, living room, dining room, study, playroom.</p>
              <p className="text-red-600">✗ Do NOT count: bathroom, toilet, kitchen, hallway, landing, utility room.</p>
              <p className="text-gray-500 mt-1">A typical 3-bed house has 5 habitable rooms (3 bedrooms + living room + dining room).</p>
            </div>
          }
        />
        <NumberField
          label="Heated rooms"
          id="number_heated_rooms"
          value={local.number_heated_rooms}
          onChange={set("number_heated_rooms")}
          min={0}
          max={30}
          placeholder="e.g. 4"
          help={
            <div className="space-y-1">
              <p>Rooms that are <strong>actively heated</strong> during the heating season.</p>
              <p>Usually the same as habitable rooms. Only lower this if you deliberately leave rooms unheated (e.g., a spare bedroom with the radiator always off).</p>
            </div>
          }
        />
      </div>
      <SelectField
        label="Tenure"
        id="tenure"
        value={local.tenure ?? ""}
        onChange={set("tenure")}
        options={TENURE_OPTIONS}
        help={<p>Who occupies the property. This affects which types of improvements are typically recommended and funded.</p>}
      />
      <FormNav />
    </form>
  );
}
