export function RoofDiagram() {
  return (
    <div className="my-2 space-y-3">
      {/* Pitched with loft insulation */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Pitched roof — insulation at loft floor</p>
        <svg viewBox="0 0 200 100" className="w-full h-20 border border-gray-100 rounded bg-sky-50">
          {/* Sky */}
          {/* Roof triangle */}
          <polygon points="100,10 10,70 190,70" fill="#b45309" stroke="#92400e" strokeWidth="2" />
          {/* Loft space */}
          <rect x="30" y="70" width="140" height="12" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
          <text x="100" y="79" textAnchor="middle" fontSize="7" fill="#92400e">insulation layer</text>
          {/* Ceiling / living space */}
          <rect x="10" y="82" width="180" height="14" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="100" y="92" textAnchor="middle" fontSize="7" fill="#1e40af">living space</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Most common. Insulation sits on loft floor between joists. 200–270mm is current standard.</p>
      </div>

      {/* Pitched at rafters */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Pitched roof — insulation at rafters (room-in-roof)</p>
        <svg viewBox="0 0 200 100" className="w-full h-20 border border-gray-100 rounded bg-sky-50">
          <polygon points="100,10 10,80 190,80" fill="#fde68a" stroke="#d97706" strokeWidth="2" />
          <polygon points="100,18 20,80 180,80" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
          <text x="100" y="62" textAnchor="middle" fontSize="7" fill="#1e40af">habitable room</text>
          <text x="100" y="74" textAnchor="middle" fontSize="6" fill="#92400e">insulation between rafters</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Loft is converted to living space. Insulation is fitted between/under the roof rafters.</p>
      </div>

      {/* Flat */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Flat roof</p>
        <svg viewBox="0 0 200 80" className="w-full h-16 border border-gray-100 rounded bg-sky-50">
          <rect x="10" y="20" width="180" height="12" fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
          <rect x="10" y="32" width="180" height="8" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
          <text x="100" y="38" textAnchor="middle" fontSize="7" fill="#92400e">insulation</text>
          <rect x="10" y="40" width="180" height="26" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="100" y="56" textAnchor="middle" fontSize="7" fill="#1e40af">living space</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Horizontal or near-horizontal roof. Common on extensions and some 1960s–80s properties.</p>
      </div>

      {/* Flat above */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Another dwelling above</p>
        <p className="text-gray-500">Your property is a mid-floor flat. The ceiling is the floor of the flat above — heat loss through the ceiling is minimal and not rated.</p>
      </div>
    </div>
  );
}

export function WallDiagram() {
  return (
    <div className="my-2 space-y-3">
      {/* Cavity wall */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Cavity wall</p>
        <svg viewBox="0 0 200 70" className="w-full h-16 border border-gray-100 rounded bg-sky-50">
          {/* Outer leaf */}
          <rect x="20" y="10" width="40" height="50" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
          <text x="40" y="40" textAnchor="middle" fontSize="7" fill="white">outer leaf</text>
          {/* Cavity */}
          <rect x="60" y="10" width="20" height="50" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1" />
          <text x="70" y="37" textAnchor="middle" fontSize="6" fill="#0369a1">gap</text>
          {/* Inner leaf */}
          <rect x="80" y="10" width="40" height="50" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
          <text x="100" y="40" textAnchor="middle" fontSize="7" fill="white">inner leaf</text>
          {/* Interior */}
          <rect x="120" y="10" width="60" height="50" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="150" y="38" textAnchor="middle" fontSize="7" fill="#1e40af">interior</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Two brick/block layers with a 50–100mm gap. Standard construction since the 1920s. The cavity can be filled with insulation (blown mineral wool, foam, or beads).</p>
      </div>

      {/* Solid wall */}
      <div>
        <p className="font-semibold text-gray-700 mb-1">Solid wall (brick or stone)</p>
        <svg viewBox="0 0 200 70" className="w-full h-16 border border-gray-100 rounded bg-sky-50">
          {/* Solid wall */}
          <rect x="20" y="10" width="80" height="50" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
          <text x="60" y="38" textAnchor="middle" fontSize="7" fill="white">solid masonry</text>
          <text x="60" y="47" textAnchor="middle" fontSize="6" fill="white">225–340mm thick</text>
          {/* Interior */}
          <rect x="100" y="10" width="80" height="50" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="140" y="38" textAnchor="middle" fontSize="7" fill="#1e40af">interior</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Single thick wall of brick or stone. Typical of pre-1920s properties. To insulate, boards are fixed to the inside surface (internal insulation) or a layer is added outside (external insulation).</p>
      </div>
    </div>
  );
}

export function FloorDiagram() {
  return (
    <div className="my-2 space-y-3">
      <div>
        <p className="font-semibold text-gray-700 mb-1">Suspended timber floor</p>
        <svg viewBox="0 0 200 70" className="w-full h-16 border border-gray-100 rounded bg-gray-50">
          <rect x="10" y="10" width="180" height="10" fill="#b45309" stroke="#92400e" strokeWidth="1" />
          <text x="100" y="18" textAnchor="middle" fontSize="7" fill="white">floorboards</text>
          <rect x="10" y="25" width="180" height="10" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1" />
          <text x="100" y="33" textAnchor="middle" fontSize="7" fill="#0369a1">void (air gap) — can add insulation here</text>
          <rect x="10" y="40" width="180" height="20" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
          <text x="100" y="53" textAnchor="middle" fontSize="7" fill="white">ground</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Wooden joists and boards over a ventilated void. Common in pre-1960s properties. Insulation (mineral wool batts) can be installed between the joists from below.</p>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-1">Solid concrete floor</p>
        <svg viewBox="0 0 200 70" className="w-full h-16 border border-gray-100 rounded bg-gray-50">
          <rect x="10" y="10" width="180" height="8" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
          <text x="100" y="17" textAnchor="middle" fontSize="6" fill="#374151">floor finish</text>
          <rect x="10" y="18" width="180" height="22" fill="#6b7280" stroke="#4b5563" strokeWidth="1" />
          <text x="100" y="32" textAnchor="middle" fontSize="7" fill="white">concrete slab</text>
          <rect x="10" y="40" width="180" height="20" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
          <text x="100" y="53" textAnchor="middle" fontSize="7" fill="white">ground</text>
        </svg>
        <p className="text-gray-500 mt-0.5">Poured concrete slab directly on the ground. Modern properties often have insulation beneath the slab or above it under the floor finish.</p>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-1">Another dwelling below</p>
        <p className="text-gray-500">Your property is not on the ground floor. The floor sits above a heated flat — heat loss is minimal and the floor is not rated.</p>
      </div>
    </div>
  );
}

export function BuiltFormDiagram() {
  return (
    <div className="my-2">
      <svg viewBox="0 0 320 110" className="w-full h-28 border border-gray-100 rounded bg-sky-50">
        {/* Detached */}
        <rect x="8" y="40" width="40" height="55" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <polygon points="28,20 8,40 48,40" fill="#2563eb" />
        <text x="28" y="105" textAnchor="middle" fontSize="7" fill="#1e40af">Detached</text>

        {/* Semi-detached */}
        <rect x="70" y="40" width="35" height="55" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="105" y="40" width="35" height="55" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="3,2" />
        <polygon points="87,20 70,40 105,40" fill="#2563eb" />
        <polygon points="122,20 105,40 140,40" fill="#7dd3fc" />
        <text x="104" y="105" textAnchor="middle" fontSize="7" fill="#1e40af">Semi-detached</text>

        {/* Mid-terrace */}
        <rect x="155" y="40" width="28" height="55" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3,2" />
        <rect x="183" y="40" width="28" height="55" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="211" y="40" width="28" height="55" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3,2" />
        <polygon points="197,22 183,40 211,40" fill="#2563eb" />
        <text x="197" y="105" textAnchor="middle" fontSize="7" fill="#1e40af">Mid-terrace</text>

        {/* End-terrace */}
        <rect x="252" y="40" width="28" height="55" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="280" y="40" width="28" height="55" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3,2" />
        <polygon points="266,22 252,40 280,40" fill="#2563eb" />
        <text x="267" y="105" textAnchor="middle" fontSize="7" fill="#1e40af">End-terrace</text>
      </svg>
      <p className="text-gray-500 text-xs mt-1">Blue = your property. Dashed = neighbouring property sharing a wall.</p>
    </div>
  );
}

export function GlazingDiagram() {
  return (
    <div className="my-2">
      <svg viewBox="0 0 220 80" className="w-full h-20 border border-gray-100 rounded bg-sky-50">
        {/* Single */}
        <rect x="10" y="15" width="50" height="50" fill="none" stroke="#374151" strokeWidth="2" />
        <rect x="32" y="15" width="4" height="50" fill="#9ca3af" />
        <text x="35" y="76" textAnchor="middle" fontSize="7" fill="#374151">Single glazed</text>

        {/* Double */}
        <rect x="85" y="15" width="50" height="50" fill="none" stroke="#374151" strokeWidth="2" />
        <rect x="107" y="15" width="3" height="50" fill="#7dd3fc" />
        <rect x="111" y="15" width="3" height="50" fill="#7dd3fc" />
        <text x="110" y="76" textAnchor="middle" fontSize="7" fill="#374151">Double glazed</text>

        {/* Triple */}
        <rect x="160" y="15" width="50" height="50" fill="none" stroke="#374151" strokeWidth="2" />
        <rect x="179" y="15" width="2.5" height="50" fill="#7dd3fc" />
        <rect x="183" y="15" width="2.5" height="50" fill="#7dd3fc" />
        <rect x="187" y="15" width="2.5" height="50" fill="#7dd3fc" />
        <text x="185" y="76" textAnchor="middle" fontSize="7" fill="#374151">Triple glazed</text>
      </svg>
      <p className="text-gray-500 text-xs mt-1">Each additional pane and the sealed gap between panes significantly reduces heat loss.</p>
    </div>
  );
}
