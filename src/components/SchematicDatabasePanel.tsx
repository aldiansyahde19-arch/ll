import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Cpu,
  Flame,
  Search,
  Send,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  BoardComponentNode,
  MOTHERBOARD_SCHEMATICS,
  MotherboardModel,
  SchematicCategory,
} from '../data/schematics';

interface SchematicDatabasePanelProps {
  onAskMinghao: (model: MotherboardModel, node: BoardComponentNode) => void;
}

const CATEGORIES: SchematicCategory[] = [
  'Semua',
  'Power & PMIC',
  'Charging & USB',
  'Display & Backlight',
  'CPU & Memori',
];

export function SchematicDatabasePanel({ onAskMinghao }: SchematicDatabasePanelProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(MOTHERBOARD_SCHEMATICS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<SchematicCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    MOTHERBOARD_SCHEMATICS[0].nodes[0].id
  );
  const [imgFailed, setImgFailed] = useState(false);

  const activeModel = useMemo(
    () =>
      MOTHERBOARD_SCHEMATICS.find((m) => m.id === selectedModelId) ??
      MOTHERBOARD_SCHEMATICS[0],
    [selectedModelId]
  );

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeModel.nodes.filter((node) => {
      const matchCat =
        selectedCategory === 'Semua' || node.category === selectedCategory;
      const matchQuery =
        !q ||
        node.designator.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q) ||
        node.railName.toLowerCase().includes(q) ||
        node.symptoms.some((s) => s.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [activeModel, selectedCategory, searchQuery]);

  const activeNode = useMemo(() => {
    return (
      filteredNodes.find((n) => n.id === selectedNodeId) ??
      filteredNodes[0] ??
      activeModel.nodes[0]
    );
  }, [filteredNodes, selectedNodeId, activeModel]);

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const nextModel = MOTHERBOARD_SCHEMATICS.find((m) => m.id === modelId);
    if (nextModel && nextModel.nodes.length > 0) {
      setSelectedNodeId(nextModel.nodes[0].id);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Basis Data Skema Motherboard
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Klik titik IC atau jalur pada board untuk cek tegangan, mode dioda, &amp; trik solder.
            </p>
          </div>
          <select
            aria-label="Pilih model motherboard"
            value={selectedModelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
          >
            {MOTHERBOARD_SCHEMATICS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.brand} · {model.modelName}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Filter */}
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode IC (U2700), jalur (VDD_MAIN), atau gejala..."
              className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
        {/* Board Overview Meta */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-mono font-medium text-slate-800">{activeModel.boardCode}</span>
          <span aria-hidden="true">·</span>
          <span>SoC: {activeModel.soc}</span>
          <span aria-hidden="true">·</span>
          <span>PMIC: {activeModel.pmicMain}</span>
        </div>

        {/* Interactive PCB Map */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          {!imgFailed ? (
            <img
              src="/src/assets/images/pcb_reference_board_1795211573566.jpg"
              alt={`Peta komponen skema ${activeModel.modelName}`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-52 w-full object-cover opacity-85"
            />
          ) : (
            <div className="flex h-52 w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-300">
              <Cpu className="h-8 w-8 text-teal-400" />
              <span className="mt-2 font-mono text-xs">{activeModel.boardCode}</span>
            </div>
          )}

          {/* Subtle dark scrim for legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />

          {/* Interactive Component Hotspots */}
          {filteredNodes.map((node) => {
            const isSelected = activeNode?.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1 font-mono text-[11px] font-semibold transition-transform whitespace-nowrap ${
                  isSelected
                    ? 'z-20 scale-110 border-white bg-teal-500 text-white shadow-md'
                    : 'z-10 border-teal-300/70 bg-slate-900/85 text-teal-200 hover:scale-105 hover:bg-teal-600 hover:text-white'
                }`}
              >
                {node.designator}
              </button>
            );
          })}

          <div className="absolute right-3 bottom-2.5 left-3 flex items-center justify-between text-[11px] text-slate-200">
            <span className="truncate font-medium">{activeModel.modelName}</span>
            <span className="font-mono text-teal-300 whitespace-nowrap shrink-0">
              {filteredNodes.length} titik komponen
            </span>
          </div>
        </div>

        {/* Power Flow Strip */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Alur Jalur Daya Utama</span>
          </div>
          <p className="mt-1 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-slate-700">
            {activeModel.powerFlowDiagram}
          </p>
        </div>

        {/* Selected Component Specs */}
        {activeNode ? (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-teal-700">
                    {activeNode.designator}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNode.category}</span>
                </div>
                <h3 className="mt-0.5 font-display text-sm font-bold text-slate-900">
                  {activeNode.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onAskMinghao(activeModel, activeNode)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tanya Mínghào</span>
              </button>
            </div>

            {/* Electrical Measurement Grid */}
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-medium text-slate-500">Nama Jalur (Rail)</div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
                  {activeNode.railName}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500">Tegangan Normal</div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-emerald-700">
                  {activeNode.normalVoltage}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-[11px] font-medium text-slate-500">
                  Nilai Mode Dioda (Probe Merah ke Ground)
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-teal-700">
                  {activeNode.diodeMode}
                </div>
              </div>
            </div>

            {/* Path Diagram */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Activity className="h-3.5 w-3.5 text-teal-600" />
                <span>Diagram Jalur Komponen</span>
              </div>
              <div className="mt-1.5 overflow-x-auto rounded-xl bg-slate-900 px-3 py-2.5 font-mono text-xs text-teal-300">
                {activeNode.pathDiagram}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <div className="text-xs font-semibold text-slate-700">Gejala Kerusakan Khas</div>
              <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-600">
                {activeNode.symptoms.map((sym, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{sym}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Diagnostic Steps */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Wrench className="h-3.5 w-3.5 text-teal-600" />
                <span>Langkah Diagnosa Cepat</span>
              </div>
              <ol className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-600">
                {activeNode.diagnosticSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-teal-700">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Solder Technique */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Flame className="h-3.5 w-3.5 text-amber-600" />
                <span>Teknik Solder &amp; Suhu Blower</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-950/90">
                {activeNode.solderTips}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            Tidak ada komponen yang cocok dengan pencarianmu. Coba kata kunci lain.
          </div>
        )}
      </div>
    </div>
  );
}
