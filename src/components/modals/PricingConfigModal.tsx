import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useStore } from "../../store/useStore";
import {
  X, Save, Settings, Layers, Wrench, Truck, Maximize,
  Check, RotateCcw, Info, Plus, Trash2, Cpu, Users,
} from "lucide-react";
import { initialPricingConfig, type Material, type Customer } from "../../data/mockData";

interface PricingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "Materiales" | "Clientes" | "Terminaciones" | "General";

const SUPPLIER_LABELS: Record<1 | 2 | 3 | "average", string> = {
  1: "Proveedor 1",
  2: "Proveedor 2",
  3: "Proveedor 3",
  average: "Promedio",
};

function newMaterial(): Material {
  return {
    id: `m-${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 0,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
    minPrice: 0,
  };
}

function newCustomer(): Customer {
  return {
    id: `c-${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    type: "Esporádico",
    contact: "",
    debt: 0,
  };
}

export const PricingConfigModal = ({ isOpen, onClose }: PricingConfigModalProps) => {
  const {
    pricingConfig, updatePricingConfig,
    materials, updateMaterials,
    customers, addCustomer, updateCustomer, deleteCustomer,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>("Materiales");
  const [formData, setFormData] = useState(pricingConfig);
  const [localMaterials, setLocalMaterials] = useState<Material[]>(materials);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [isSaving, setIsSaving] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(pricingConfig);
      setLocalMaterials(materials);
      setLocalCustomers(customers);
      setShowCheck(false);
      setActiveTab("Materiales");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  // ── Config helpers ────────────────────────────────────────────────────────

  const handleConfigChange = (
    path: string,
    value: number,
    section?: "finishingMultipliers" | "finishingAddons"
  ) => {
    if (section) {
      setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [path]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [path]: value }));
    }
  };

  // ── Material helpers ──────────────────────────────────────────────────────

  const handleMaterialChange = <K extends keyof Material>(id: string, field: K, value: Material[K]) => {
    setLocalMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleMaterialTypeChange = (id: string, type: "Rígido" | "Flexible") => {
    setLocalMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        return type === "Rígido"
          ? { ...m, type, unit: "planchas", sheetWidth: 120, sheetHeight: 240 }
          : { ...m, type, unit: "m", sheetWidth: undefined, sheetHeight: undefined };
      })
    );
  };

  const handleAddMaterial = () => {
    setLocalMaterials((prev) => [...prev, newMaterial()]);
  };

  const handleDeleteMaterial = (id: string) => {
    setLocalMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const getEffectivePreview = (m: Material): number => {
    if (m.activeSupplier === "average") {
      const slots = [m.supplier1Price, m.supplier2Price, m.supplier3Price].filter((p) => p > 0);
      return slots.length > 0 ? slots.reduce((a, b) => a + b, 0) / slots.length : 0;
    }
    if (m.activeSupplier === 1) return m.supplier1Price;
    if (m.activeSupplier === 2) return m.supplier2Price;
    return m.supplier3Price;
  };

  // ── Customer helpers ──────────────────────────────────────────────────────

  const handleCustomerChange = <K extends keyof Customer>(id: string, field: K, value: Customer[K]) => {
    setLocalCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleAddCustomer = () => {
    setLocalCustomers((prev) => [...prev, newCustomer()]);
  };

  const handleDeleteLocalCustomer = (id: string) => {
    setLocalCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validate materials — must have a name
    const invalid = localMaterials.filter((m) => !m.name.trim());
    if (invalid.length > 0) {
      toast.error("Todos los materiales deben tener un nombre.");
      return;
    }

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    updatePricingConfig(formData);
    updateMaterials(localMaterials);

    // Sync customers: deletions, updates, additions
    const existingIds = new Set(customers.map((c) => c.id));
    const localIds = new Set(localCustomers.map((c) => c.id));

    // Deletions
    for (const c of customers) {
      if (!localIds.has(c.id)) deleteCustomer(c.id);
    }
    // Additions & updates
    for (const c of localCustomers) {
      if (!c.name.trim()) continue; // skip blank rows
      if (existingIds.has(c.id)) {
        updateCustomer(c);
      } else {
        addCustomer(c);
      }
    }

    setIsSaving(false);
    setShowCheck(true);
    toast.success("Configuración guardada");
    await new Promise((r) => setTimeout(r, 800));
    onClose();
  };

  const handleRestoreDefaults = () => {
    setFormData(initialPricingConfig);
  };

  const tabs: TabType[] = ["Materiales", "Clientes", "Terminaciones", "General"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-zinc-900 flex items-center justify-center shadow-lg">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Configuración del Sistema</h2>
              <p className="text-zinc-500 text-xs">Materiales, clientes, costos y márgenes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 bg-zinc-900/50 flex gap-2 border-b border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-zinc-900 shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* ── MATERIALES ── */}
          {activeTab === "Materiales" && (
            <div className="space-y-5">
              {localMaterials.map((material) => {
                const effectivePrice = getEffectivePreview(material);
                return (
                  <div key={material.id} className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                    {/* Name + type + delete */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) => handleMaterialChange(material.id, "name", e.target.value)}
                        placeholder="Nombre del material"
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-600"
                      />
                      {/* Type selector */}
                      <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs font-semibold shrink-0">
                        {(["Flexible", "Rígido"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => handleMaterialTypeChange(material.id, t)}
                            className={`px-2.5 py-1.5 transition-colors ${
                              material.type === t
                                ? t === "Rígido"
                                  ? "bg-amber-500 text-white"
                                  : "bg-blue-500 text-white"
                                : "bg-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleDeleteMaterial(material.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                        title="Eliminar material"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Rigid workspace dimensions */}
                    {material.type === "Rígido" && (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Maximize size={11} />
                        <span>Área de trabajo:</span>
                        <input
                          type="number"
                          value={material.sheetWidth ?? 120}
                          onChange={(e) => handleMaterialChange(material.id, "sheetWidth", parseInt(e.target.value) || 0)}
                          className="w-14 bg-transparent border-b border-zinc-700 focus:border-white outline-none text-center font-mono text-zinc-300"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          value={material.sheetHeight ?? 240}
                          onChange={(e) => handleMaterialChange(material.id, "sheetHeight", parseInt(e.target.value) || 0)}
                          className="w-14 bg-transparent border-b border-zinc-700 focus:border-white outline-none text-center font-mono text-zinc-300"
                        />
                        <span>cm</span>
                        <span className="ml-2">Precio mín.:</span>
                        <input
                          type="number"
                          value={material.minPrice ?? 0}
                          onChange={(e) => handleMaterialChange(material.id, "minPrice", parseFloat(e.target.value) || 0)}
                          className="w-20 bg-transparent border-b border-zinc-700 focus:border-white outline-none text-center font-mono text-zinc-300"
                        />
                        <span>CLP</span>
                      </div>
                    )}
                    {material.type === "Flexible" && (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <span>Precio mín.:</span>
                        <input
                          type="number"
                          value={material.minPrice ?? 0}
                          onChange={(e) => handleMaterialChange(material.id, "minPrice", parseFloat(e.target.value) || 0)}
                          className="w-20 bg-transparent border-b border-zinc-700 focus:border-white outline-none text-center font-mono text-zinc-300"
                        />
                        <span>CLP / pieza</span>
                      </div>
                    )}

                    {/* 3 supplier slots */}
                    <div className="grid grid-cols-3 gap-2">
                      {([1, 2, 3] as const).map((slot) => {
                        const field = `supplier${slot}Price` as "supplier1Price" | "supplier2Price" | "supplier3Price";
                        return (
                          <div key={slot}>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
                              Proveedor {slot}
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                              <input
                                type="number"
                                value={material[field]}
                                onChange={(e) => handleMaterialChange(material.id, field, parseFloat(e.target.value) || 0)}
                                className="w-full pl-5 pr-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg focus:ring-1 focus:ring-white outline-none font-mono text-white text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Active supplier + effective price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Activo:</span>
                        <div className="flex gap-1">
                          {([1, 2, 3, "average"] as const).map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleMaterialChange(material.id, "activeSupplier", opt)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                                material.activeSupplier === opt
                                  ? "bg-white text-zinc-900"
                                  : "bg-zinc-800 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {SUPPLIER_LABELS[opt]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500">Precio efectivo</p>
                        <p className="text-xs font-mono font-bold text-white">
                          ${effectivePrice.toLocaleString("es-CL")}
                          <span className="text-zinc-500 font-normal ml-1">
                            {material.type === "Rígido" ? "/ plancha" : "/ m²"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleAddMaterial}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors text-sm font-medium"
              >
                <Plus size={15} /> Agregar material
              </button>
            </div>
          )}

          {/* ── CLIENTES ── */}
          {activeTab === "Clientes" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={15} className="text-zinc-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Clientes</h3>
                <span className="ml-auto text-xs text-zinc-500">{localCustomers.length} registrados</span>
              </div>

              {localCustomers.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-6">Sin clientes. Agrega el primero.</p>
              )}

              {localCustomers.map((customer) => (
                <div key={customer.id} className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => handleCustomerChange(customer.id, "name", e.target.value)}
                      placeholder="Nombre empresa / persona"
                      className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-600"
                    />
                    <select
                      value={customer.type}
                      onChange={(e) => handleCustomerChange(customer.id, "type", e.target.value as Customer["type"])}
                      className="px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 text-xs focus:ring-1 focus:ring-white outline-none"
                    >
                      <option value="Complejo">Complejo</option>
                      <option value="Recurrente">Recurrente</option>
                      <option value="Esporádico">Esporádico</option>
                    </select>
                    <button
                      onClick={() => handleDeleteLocalCustomer(customer.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customer.contact}
                      onChange={(e) => handleCustomerChange(customer.id, "contact", e.target.value)}
                      placeholder="Contacto"
                      className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 text-xs focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-600"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                      <input
                        type="number"
                        value={customer.debt}
                        onChange={(e) => handleCustomerChange(customer.id, "debt", parseFloat(e.target.value) || 0)}
                        placeholder="Deuda"
                        className="w-full pl-5 pr-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 text-xs focus:ring-1 focus:ring-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddCustomer}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors text-sm font-medium"
              >
                <Plus size={15} /> Agregar cliente
              </button>
            </div>
          )}

          {/* ── TERMINACIONES ── */}
          {activeTab === "Terminaciones" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={16} className="text-zinc-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Multiplicadores</h3>
                </div>
                <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-1">
                  <div className="flex items-center gap-2 p-3 text-amber-500/80 bg-amber-500/5 rounded-t-lg border-b border-zinc-800 mb-2">
                    <Info size={14} />
                    <p className="text-[11px] font-medium leading-tight">
                      Se aplican al precio base del material según el área total.
                    </p>
                  </div>
                  <div className="p-3 space-y-4">
                    {Object.entries(formData.finishingMultipliers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-zinc-400">{key}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={value}
                          onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0, "finishingMultipliers")}
                          className="w-20 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg focus:ring-1 focus:ring-white outline-none text-right font-mono text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={16} className="text-zinc-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cargos Adicionales</h3>
                </div>
                <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-4 space-y-4">
                  {Object.entries(formData.finishingAddons).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-zinc-400">{key}</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0, "finishingAddons")}
                          className="w-24 pl-5 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg focus:ring-1 focus:ring-white outline-none text-right font-mono text-white text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GENERAL ── */}
          {activeTab === "General" && (
            <div className="max-w-md space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest block">Margen Rígidos (%)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">%</div>
                  <input type="number" step="0.01" value={formData.rigidMargin}
                    onChange={(e) => handleConfigChange("rigidMargin", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-white outline-none font-mono text-white" />
                </div>
                <p className="text-[11px] text-zinc-500">Porcentaje sobre costo base plancha (ej: 0.40 = 40%)</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest block">Margen Flexibles (%)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">%</div>
                  <input type="number" step="0.01" value={formData.globalMargin}
                    onChange={(e) => handleConfigChange("globalMargin", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-white outline-none font-mono text-white" />
                </div>
                <p className="text-[11px] text-zinc-500">Margen global sobre precio final flexible (ej: 0.35 = 35%)</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Truck size={14} /> Costo Despacho
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600 font-mono">CLP</div>
                    <input type="number" value={formData.despachoCost}
                      onChange={(e) => handleConfigChange("despachoCost", parseFloat(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-white outline-none font-mono text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={14} /> Instalación (Base)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600 font-mono">CLP</div>
                    <input type="number" value={formData.instalacionDefault}
                      onChange={(e) => handleConfigChange("instalacionDefault", parseFloat(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-white outline-none font-mono text-white" />
                  </div>
                </div>
              </div>

              {/* Machine list */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Cpu size={14} /> Máquinas de Producción
                </label>
                <p className="text-[11px] text-zinc-500">Lista usada para asignar máquinas a órdenes en producción.</p>
                <div className="space-y-2">
                  {formData.machines.map((machine, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={machine}
                        onChange={(e) => {
                          const updated = [...formData.machines];
                          updated[idx] = e.target.value;
                          setFormData((prev) => ({ ...prev, machines: updated }));
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-1 focus:ring-white outline-none text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => {
                          const updated = formData.machines.filter((_, i) => i !== idx);
                          setFormData((prev) => ({ ...prev, machines: updated }));
                        }}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setFormData((prev) => ({ ...prev, machines: [...prev.machines, ""] }))}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors font-medium"
                >
                  <Plus size={13} /> Agregar máquina
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
          {activeTab !== "Clientes" ? (
            <button
              onClick={handleRestoreDefaults}
              className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
            >
              <RotateCcw size={16} /> Restaurar Defaults
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 text-zinc-400 hover:text-white rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || showCheck}
              className={`min-w-[140px] px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                showCheck ? "bg-emerald-500 text-white" : "bg-white text-zinc-900 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              ) : showCheck ? (
                <><Check size={18} className="animate-in zoom-in duration-300" /> Guardado</>
              ) : (
                <><Save size={18} /> Guardar Cambios</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
