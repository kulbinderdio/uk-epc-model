"use client";

import { useState } from "react";
import type { PropertyInput } from "@/types/epc";
import { SelectField, NumberField, FormNav } from "./FormField";
import { RoofDiagram, WallDiagram, FloorDiagram, GlazingDiagram } from "./Diagrams";
import {
  ENERGY_EFF_OPTIONS,
  WALL_DESCRIPTIONS,
  ROOF_DESCRIPTIONS,
  FLOOR_DESCRIPTIONS,
  WINDOWS_DESCRIPTIONS,
  GLAZED_TYPE_OPTIONS,
} from "@/lib/formOptions";

interface Props {
  data: Partial<PropertyInput>;
  onNext: (d: Partial<PropertyInput>) => void;
  onBack: () => void;
}

const energyEffHelp = (component: string) => (
  <div className="space-y-1">
    <p>The assessor&apos;s rating of how well the <strong>{component}</strong> retains heat compared to current building standards.</p>
    <ul className="mt-1 space-y-0.5">
      <li><strong>Very Good</strong> — modern or recently upgraded; exceeds current standards.</li>
      <li><strong>Good</strong> — meets or closely approaches current standards.</li>
      <li><strong>Average</strong> — typical of mid-vintage stock; some scope for improvement.</li>
      <li><strong>Poor</strong> — below modern standards; significant heat loss.</li>
      <li><strong>Very Poor</strong> — no insulation or very old construction; major heat loss.</li>
    </ul>
    <p className="text-gray-500 mt-1">If you&apos;re unsure, choose &quot;Average&quot; as a starting point.</p>
  </div>
);

export default function Step2Envelope({ data, onNext, onBack }: Props) {
  const [local, setLocal] = useState<Partial<PropertyInput>>(data);
  const set = (k: keyof PropertyInput) => (v: unknown) => setLocal((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Walls */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Walls</h3>
        <SelectField
          label="Wall description"
          id="walls_description"
          value={local.walls_description ?? ""}
          onChange={set("walls_description")}
          options={WALL_DESCRIPTIONS}
          help={
            <div>
              <p className="mb-2">The construction type and insulation status of the main external walls.</p>
              <WallDiagram />
              <p className="mt-1 text-gray-500">
                <strong>Tip:</strong> Cavity walls were standard from around the 1920s onwards. If your property was built before 1920, it almost certainly has solid walls.
                To check if a cavity has been filled, look for small filled holes in a regular pattern in the mortar between bricks on the outside.
              </p>
            </div>
          }
        />
        <SelectField
          label="Wall energy efficiency"
          id="walls_energy_eff"
          value={local.walls_energy_eff ?? ""}
          onChange={set("walls_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={energyEffHelp("walls")}
        />
      </div>

      {/* Roof */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Roof</h3>
        <SelectField
          label="Roof description"
          id="roof_description"
          value={local.roof_description ?? ""}
          onChange={set("roof_description")}
          options={ROOF_DESCRIPTIONS}
          help={
            <div>
              <p className="mb-2">The type of roof and its insulation level. Roofs account for up to 25% of a home&apos;s heat loss.</p>
              <RoofDiagram />
              <p className="mt-1 text-gray-500">
                <strong>Current standard</strong> is 270mm of mineral wool insulation on the loft floor. Check your loft — you can measure the depth with a ruler.
              </p>
            </div>
          }
        />
        <SelectField
          label="Roof energy efficiency"
          id="roof_energy_eff"
          value={local.roof_energy_eff ?? ""}
          onChange={set("roof_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={energyEffHelp("roof")}
        />
      </div>

      {/* Floor */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Floor</h3>
        <SelectField
          label="Floor description"
          id="floor_description"
          value={local.floor_description ?? ""}
          onChange={set("floor_description")}
          options={FLOOR_DESCRIPTIONS}
          help={
            <div>
              <p className="mb-2">The ground floor construction type. Ground floors account for around 15% of heat loss in an uninsulated home.</p>
              <FloorDiagram />
              <p className="mt-1 text-gray-500">
                <strong>Suspended timber</strong>: if your ground floor feels &quot;bouncy&quot; or sounds hollow when knocked, it&apos;s likely suspended timber.<br />
                <strong>Solid concrete</strong>: feels hard and does not flex. Common in post-war and modern properties.
              </p>
            </div>
          }
        />
        <SelectField
          label="Floor energy efficiency"
          id="floor_energy_eff"
          value={local.floor_energy_eff ?? ""}
          onChange={set("floor_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={energyEffHelp("floor")}
        />
      </div>

      {/* Windows */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Windows</h3>
        <SelectField
          label="Windows description"
          id="windows_description"
          value={local.windows_description ?? ""}
          onChange={set("windows_description")}
          options={WINDOWS_DESCRIPTIONS}
          help={
            <div>
              <p className="mb-2">The type of glazing fitted to the majority of your windows and glazed doors.</p>
              <GlazingDiagram />
              <p className="mt-1 text-gray-500">
                To check: look at the edge of a window pane — double glazing has a visible spacer bar between two panes. Triple glazing has two spacer bars. If you see a single pane with no spacer, it&apos;s single glazed.
              </p>
            </div>
          }
        />
        <SelectField
          label="Window energy efficiency"
          id="windows_energy_eff"
          value={local.windows_energy_eff ?? ""}
          onChange={set("windows_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={energyEffHelp("windows")}
        />
        <SelectField
          label="Glazing type"
          id="glazed_type"
          value={local.glazed_type ?? ""}
          onChange={set("glazed_type")}
          options={GLAZED_TYPE_OPTIONS}
          help={<p>The type of gas or air between the panes. Modern double glazing often uses argon gas, which insulates better than air.</p>}
        />
        <NumberField
          label="Proportion double or triple glazed"
          id="multi_glaze_proportion"
          value={local.multi_glaze_proportion}
          onChange={set("multi_glaze_proportion")}
          unit="%"
          min={0}
          max={100}
          step={5}
          placeholder="e.g. 100"
          help={
            <div className="space-y-1">
              <p>What percentage of your windows and glazed external doors have double or triple glazing?</p>
              <p className="text-gray-500">Examples: All windows double glazed = 100%. Half double, half single = 50%. All single = 0%.</p>
            </div>
          }
        />
      </div>

      {/* Other */}
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Extensions"
          id="extension_count"
          value={local.extension_count}
          onChange={set("extension_count")}
          min={0}
          max={20}
          placeholder="0"
          help={<p>The number of extensions that have been added to the original building (e.g., a rear kitchen extension, a side garage conversion). Enter 0 if none.</p>}
        />
        <NumberField
          label="Open fireplaces"
          id="number_open_fireplaces"
          value={local.number_open_fireplaces}
          onChange={set("number_open_fireplaces")}
          min={0}
          max={20}
          placeholder="0"
          help={<p>Open fireplaces (not gas or electric fires) that are <strong>not</strong> blocked off. Each open fireplace is a significant source of draughts and heat loss. Enter 0 if none or all are blocked.</p>}
        />
      </div>
      <FormNav onBack={onBack} />
    </form>
  );
}
