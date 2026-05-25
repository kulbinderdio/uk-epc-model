"use client";

import { useState } from "react";
import type { PropertyInput } from "@/types/epc";
import { SelectField, NumberField, RadioField, FormNav } from "./FormField";
import {
  ENERGY_EFF_OPTIONS,
  ENERGY_TARIFF_OPTIONS,
  MAIN_FUEL_OPTIONS,
  MAINHEAT_DESCRIPTIONS,
  HOTWATER_DESCRIPTIONS,
  VENTILATION_OPTIONS,
} from "@/lib/formOptions";

interface Props {
  data: Partial<PropertyInput>;
  onNext: (d: Partial<PropertyInput>) => void;
  onBack: () => void;
}

const YES_NO = [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }];

export default function Step3Heating({ data, onNext, onBack }: Props) {
  const [local, setLocal] = useState<Partial<PropertyInput>>(data);
  const set = (k: keyof PropertyInput) => (v: unknown) => setLocal((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Main Heating */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Main Heating</h3>
        <SelectField
          label="Main fuel"
          id="main_fuel"
          value={local.main_fuel ?? ""}
          onChange={set("main_fuel")}
          options={MAIN_FUEL_OPTIONS}
          help={
            <div className="space-y-1">
              <p>The primary fuel that heats your home.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>Mains gas</strong> — connected to the gas grid (most common in urban/suburban UK)</li>
                <li><strong>Electricity</strong> — storage heaters, heat pumps, or direct electric radiators</li>
                <li><strong>Oil</strong> — stored in a tank outside; common in rural areas</li>
                <li><strong>LPG</strong> — liquid petroleum gas, stored in a tank or cylinders</li>
                <li><strong>Heat pump</strong> — air source or ground source; uses electricity but very efficiently</li>
              </ul>
            </div>
          }
        />
        <SelectField
          label="Main heating system"
          id="mainheat_description"
          value={local.mainheat_description ?? ""}
          onChange={set("mainheat_description")}
          options={MAINHEAT_DESCRIPTIONS}
          help={
            <div className="space-y-1">
              <p>The type of heating system that heats the majority of your home.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>Boiler and radiators</strong> — a central boiler heats water which circulates through radiators. The most common system in UK homes.</li>
                <li><strong>Electric storage heaters</strong> — charge overnight on cheap electricity and release heat during the day.</li>
                <li><strong>Warm air system</strong> — a furnace blows heated air through ducts. Common in 1960s–70s properties.</li>
                <li><strong>Heat pump</strong> — extracts heat from outside air or the ground, very efficient.</li>
                <li><strong>Room heaters</strong> — individual heaters in each room, no central system.</li>
              </ul>
            </div>
          }
        />
        <SelectField
          label="Main heating efficiency"
          id="mainheat_energy_eff"
          value={local.mainheat_energy_eff ?? ""}
          onChange={set("mainheat_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={
            <div className="space-y-1">
              <p>How efficiently the main heating system converts fuel into heat.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>Very Good</strong> — modern condensing boiler (installed post-2005), heat pump, or new high-efficiency system.</li>
                <li><strong>Good</strong> — relatively modern boiler or well-maintained system.</li>
                <li><strong>Average</strong> — older standard boiler still in reasonable condition.</li>
                <li><strong>Poor / Very Poor</strong> — old non-condensing boiler, back boiler, or inefficient room heaters.</li>
              </ul>
            </div>
          }
        />
        <SelectField
          label="Heating controls efficiency"
          id="mainheatc_energy_eff"
          value={local.mainheatc_energy_eff ?? ""}
          onChange={set("mainheatc_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={
            <div className="space-y-1">
              <p>How good your heating controls are at managing the system efficiently.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>Very Good</strong> — full programmer, room thermostat, thermostatic radiator valves (TRVs) on all radiators, and boiler interlock.</li>
                <li><strong>Good</strong> — programmer + room thermostat + some TRVs.</li>
                <li><strong>Average</strong> — programmer + room thermostat, no TRVs.</li>
                <li><strong>Poor</strong> — manual controls only, or time switch only.</li>
              </ul>
            </div>
          }
        />
        <SelectField
          label="Secondary heating efficiency"
          id="sheating_energy_eff"
          value={local.sheating_energy_eff ?? ""}
          onChange={set("sheating_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          placeholder="None / not applicable"
          help={<p>If you have a secondary heating source (e.g., a wood-burning stove, gas fire, or electric heater used alongside the main system), rate its efficiency here. Leave blank if no secondary heating.</p>}
        />
      </div>

      {/* Hot Water */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Hot Water</h3>
        <SelectField
          label="Hot water system"
          id="hotwater_description"
          value={local.hotwater_description ?? ""}
          onChange={set("hotwater_description")}
          options={HOTWATER_DESCRIPTIONS}
          help={
            <div className="space-y-1">
              <p>How your domestic hot water is heated.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>From main system</strong> — the same boiler that heats your radiators also heats your hot water (most common).</li>
                <li><strong>Electric immersion</strong> — a tank with an electric element, like a large kettle. Standard tariff is more expensive; off-peak uses cheaper overnight electricity.</li>
                <li><strong>Combi boiler</strong> — heats water on demand, no storage tank needed.</li>
              </ul>
            </div>
          }
        />
        <SelectField
          label="Hot water efficiency"
          id="hot_water_energy_eff"
          value={local.hot_water_energy_eff ?? ""}
          onChange={set("hot_water_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={<p>Efficiency of your hot water system. A well-insulated hot water cylinder with a thermostat rates higher. An uninsulated cylinder or inefficient immersion rates lower.</p>}
        />
      </div>

      {/* Lighting */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Lighting</h3>
        <SelectField
          label="Lighting efficiency"
          id="lighting_energy_eff"
          value={local.lighting_energy_eff ?? ""}
          onChange={set("lighting_energy_eff")}
          options={ENERGY_EFF_OPTIONS}
          help={<p>Overall rating of your lighting system&apos;s energy efficiency. Primarily driven by what proportion of bulbs are LED/CFL. &ldquo;Very Good&rdquo; means all or nearly all bulbs are LED/CFL; &ldquo;Poor&rdquo; means mostly traditional incandescent bulbs.</p>}
        />
      </div>

      {/* Renewables & Flags */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Renewables & Connections</h3>
        <SelectField
          label="Electricity tariff"
          id="energy_tariff"
          value={local.energy_tariff ?? ""}
          onChange={set("energy_tariff")}
          options={ENERGY_TARIFF_OPTIONS}
          placeholder="Unknown"
          help={
            <div className="space-y-1">
              <p>The type of electricity tariff for your property.</p>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                <li><strong>Standard single-rate / Standard tariff</strong> — one price per unit, all day (the most common).</li>
                <li><strong>Economy 7 (dual-rate)</strong> — cheaper overnight electricity for 7 hours; often used with storage heaters or an immersion heater.</li>
                <li><strong>Off-peak</strong> — similar to Economy 7 but with a different off-peak window duration.</li>
              </ul>
            </div>
          }
        />
        <RadioField
          label="Connected to mains gas?"
          id="mains_gas_flag"
          value={local.mains_gas_flag ?? ""}
          onChange={set("mains_gas_flag")}
          options={YES_NO}
          help={<p>Is your property connected to the mains gas grid? If you have a gas meter or gas appliances, the answer is Yes. Properties in rural areas are often not connected and use oil, LPG, or electricity instead.</p>}
        />
        <RadioField
          label="Solar water heating?"
          id="solar_water_heating_flag"
          value={local.solar_water_heating_flag ?? ""}
          onChange={set("solar_water_heating_flag")}
          options={YES_NO}
          help={<p>Do you have solar thermal panels (not solar PV electricity panels) that heat water? Solar water heating panels are typically flat panels or evacuated tubes on the roof connected to the hot water cylinder.</p>}
        />
        <RadioField
          label="Solar PV panels?"
          id="photo_supply"
          value={local.photo_supply ?? ""}
          onChange={set("photo_supply")}
          options={YES_NO}
          help={<p>Do you have photovoltaic (PV) solar panels that generate electricity? These are the most common type of solar panel. They are usually dark-coloured rectangular panels mounted on the roof.</p>}
        />
        <NumberField
          label="Wind turbines"
          id="wind_turbine_count"
          value={local.wind_turbine_count}
          onChange={set("wind_turbine_count")}
          min={0}
          max={10}
          placeholder="0"
          help={<p>Number of wind turbines on or immediately adjacent to the property. Enter 0 if none. Small domestic wind turbines are uncommon but do appear on some rural properties.</p>}
        />
      </div>

      <SelectField
        label="Mechanical ventilation"
        id="mechanical_ventilation"
        value={local.mechanical_ventilation ?? ""}
        onChange={set("mechanical_ventilation")}
        options={VENTILATION_OPTIONS}
        placeholder="Natural ventilation (default)"
        help={
          <div className="space-y-1">
            <p>How fresh air enters and stale air leaves the building.</p>
            <ul className="mt-1 space-y-0.5 text-gray-600">
              <li><strong>Natural</strong> — through windows, doors, and gaps (the default for most homes).</li>
              <li><strong>Mechanical extract only</strong> — fans in kitchen/bathroom extract air; fresh air enters naturally.</li>
              <li><strong>Mechanical supply and extract (MVHR)</strong> — a whole-house ventilation system that recovers heat from extracted air. Common in very airtight new-build homes.</li>
            </ul>
          </div>
        }
      />

      <FormNav onBack={onBack} />
    </form>
  );
}
