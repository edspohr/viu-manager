import React, { useState } from 'react';
import { useStore } from '../store/useStore'; 
import { Zap, Clock, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Order } from '../data/mockData';

export function SmartCotizador() {
  const { customers, materials, addOrder } = useStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [showPricing, setShowPricing] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  
  // AI & DragDrop States
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  // Fake capacity for the simulation
  const plantCapacity = 85; 

  // Handler helpers
  const updateField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setShowPricing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsAnalyzing(true);

    // Simulate Gemini 2.5 Flash Analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiSuggested(true);
      
      // Auto-fill mock data
      setCampaignName("Campaña Verano 2025");
      // Find a customer to select (mock)
      const mockCustomer = customers.find(c => c.name.includes("Fashion")) || customers[0];
      if (mockCustomer) setSelectedCustomerId(mockCustomer.id);
      
      // Find material (mock)
      const mockMaterial = materials.find(m => m.name.includes("Foam")) || materials[0];
      if (mockMaterial) setSelectedMaterialId(mockMaterial.id);

      setWidth(120);
      setHeight(200);
      setQuantity(50);
      
      // Trigger calculation availability
      // But user still needs to click calculate or we can auto-show if we want.
      // Let's let them verify first.
    }, 2000);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerId && selectedMaterialId && width && height && quantity && campaignName) {
      setShowPricing(true);
    }
  };

  // Complex Pricing Logic
  const getPricingDetails = () => {
    const material = materials.find(m => m.id === selectedMaterialId);
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    if (!material || !customer) return { total: 0, margin: 0, waste: 0 };

    // 1. Calculate base material cost with realistic waste
    // Bin Packing Heuristic Simulation for Waste %
    const plateW = 122;
    const plateH = 244;
    const pieceArea = width * height;
    const plateArea = plateW * plateH;
    
    // Naive fit calculation
    const fitW = Math.floor(plateW / width) * Math.floor(plateH / height);
    const fitH = Math.floor(plateW / height) * Math.floor(plateH / width);
    const maxPiecesPerPlate = Math.max(fitW, fitH);
    
    const usefulAreaPerPlate = maxPiecesPerPlate * pieceArea;
    const wastePerPlate = plateArea - usefulAreaPerPlate;
    const wastePercentage = maxPiecesPerPlate > 0 ? (wastePerPlate / plateArea) : 1;
    
    // Cost calculation
    // const totalMaterialArea = (pieceArea * quantity) / 10000; // m2 (Unused for now)
    // Price per unit is usually per plate in mockData. 
    // Let's assume pricePerUnit is per plate for Rigid.
    
    // Plates needed
    const platesNeeded = maxPiecesPerPlate > 0 ? Math.ceil(quantity / maxPiecesPerPlate) : 0;
    const materialCost = platesNeeded * material.pricePerUnit;

    // Operational Costs (Mocked)
    const cutTimeMin = quantity * 2; // 2 mins per piece
    const printTimeMin = quantity * 5; // 5 mins per piece
    const valMin = 350; // $350 CLP per minute operational cost
    
    const operationalCost = (cutTimeMin + printTimeMin) * valMin;
    
    const baseCost = materialCost + operationalCost;

    // Margin based on customer type
    let marginMultiplier = 1.4; // Default 40%
    if (customer.type === 'Complejo') marginMultiplier = 1.25; // High volume, lower margin
    if (customer.type === 'Recurrente') marginMultiplier = 1.35;
    
    const total = Math.round(baseCost * marginMultiplier);

    return {
       total,
       waste: Math.round(wastePercentage * 100),
       plates: platesNeeded,
       utilization: Math.round((1 - wastePercentage) * 100)
    };
  };

  const pricing = getPricingDetails();
  const basePrice = pricing.total;
  const handleCreateOrder = (price: number, deliveryDate: string) => {
    if (!selectedCustomerId || !selectedMaterialId || !width || !height || !quantity || !campaignName) return;

    const newOrder: Order = {
      id: `o${Date.now()}`,
      customerId: selectedCustomerId,
      campaignName: campaignName,
      status: 'En Cotización',
      items: [
        {
          materialId: selectedMaterialId,
          width,
          height,
          quantity,
          finishing: []
        }
      ],
      totalAmount: price,
      deliveryDate: deliveryDate,
      createdAt: new Date().toISOString().split('T')[0],
      fileStatus: isAnalyzing ? 'Verde' : 'Amarillo'
    };

    addOrder(newOrder);
    alert('Cotización creada exitosamente');
    
    // Reset
    setShowPricing(false);
    setSelectedCustomerId('');
    setSelectedMaterialId('');
    setWidth(0);
    setHeight(0);
    setQuantity(1);
    setCampaignName('');
    setAiSuggested(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          Smart Cotizador
          <span className="ml-2 text-[10px] bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Gemini 2.5 Flash
          </span>
        </h2>
      </div>
      
      <div className="p-6">
        {/* Drag & Drop Area */}
        <div 
           className={cn(
             "border-2 border-dashed rounded-xl p-8 mb-8 text-center transition-all duration-300 ease-in-out cursor-pointer group",
             isDragOver ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
             isAnalyzing ? "border-purple-500 bg-purple-50" : ""
           )}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
        >
          {isAnalyzing ? (
            <div className="flex flex-col items-center animate-pulse">
               <div className="h-10 w-10 text-purple-600 mb-3">
                 <Zap className="h-full w-full animate-spin-slow" />
               </div>
               <h3 className="text-lg font-medium text-purple-700">Analizando PDF con Gemini 2.5 Flash...</h3>
               <p className="text-sm text-purple-500 mt-1">Extrayendo especificaciones y vectores</p>
            </div>
          ) : (
            <div className="space-y-2 pointer-events-none">
              <div className="flex justify-center mb-2">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                  <span className="text-2xl">📄</span>
                </div>
              </div>
              <p className="text-slate-600 font-medium group-hover:text-blue-600 transition-colors">
                Arrastra tu PDF técnico aquí
              </p>
              <p className="text-sm text-slate-400">
                IA detectará material, medidas y cantidades automáticamente.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
             <form onSubmit={handleCalculate} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Campaña</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all",
                      aiSuggested ? "border-purple-300 bg-purple-50/30 ring-purple-100" : "border-slate-300 focus:ring-blue-500"
                    )}
                    placeholder="Ej: Campaña Verano 2024"
                    value={campaignName}
                    onChange={e => updateField(setCampaignName, e.target.value)}
                    required
                  />
                  {aiSuggested && <span className="absolute right-3 top-2.5 text-purple-500 animate-pulse">✨</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={selectedCustomerId}
                  onChange={(e) => updateField(setSelectedCustomerId, e.target.value)}
                  required
                >
                  <option value="">Seleccionar Cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
                <select 
                  className={cn(
                      "w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all",
                      aiSuggested ? "border-purple-300 bg-purple-50/30" : "border-slate-300 focus:ring-blue-500"
                    )}
                  value={selectedMaterialId}
                  onChange={(e) => updateField(setSelectedMaterialId, e.target.value)}
                  required
                >
                  <option value="">Seleccionar Material...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - Stock: {m.stock}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ancho (cm)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all",
                        aiSuggested ? "border-purple-300 bg-purple-50/30" : "border-slate-300 focus:ring-blue-500"
                      )}
                      value={width || ''}
                      onChange={e => updateField(setWidth, Number(e.target.value))}
                      required
                    />
                    {aiSuggested && <span className="absolute right-8 top-2.5 text-xs text-purple-500 font-medium">AI</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alto (cm)</label>
                   <div className="relative">
                    <input 
                      type="number" 
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all",
                        aiSuggested ? "border-purple-300 bg-purple-50/30" : "border-slate-300 focus:ring-blue-500"
                      )}
                      value={height || ''}
                      onChange={e => updateField(setHeight, Number(e.target.value))}
                      required
                    />
                     {aiSuggested && <span className="absolute right-8 top-2.5 text-xs text-purple-500 font-medium">AI</span>}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                 <div className="relative">
                  <input 
                    type="number" 
                    className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all",
                        aiSuggested ? "border-purple-300 bg-purple-50/30" : "border-slate-300 focus:ring-blue-500"
                      )}
                    value={quantity}
                    onChange={e => updateField(setQuantity, Number(e.target.value))}
                    min={1}
                    required
                  />
                   {aiSuggested && <span className="absolute right-8 top-2.5 text-xs text-purple-500 font-medium">AI</span>}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center justify-center gap-2"
              >
                Calcular Optimización
                <ArrowRight className="h-4 w-4" />
              </button>
             </form>
          </div>

          {/* Visualization area */}
          <div className="flex flex-col gap-6">
             <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative p-4 flex flex-col items-center">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 w-full text-left">
                  Bin Packing Visualizer (122x244cm)
                </h3>
                
                {width && height ? (
                   <div className="relative bg-white shadow-sm border border-slate-300 w-[244px] h-[122px] flex flex-wrap content-start overflow-hidden">
                      {/* Simple Grid Simulation */}
                      {Array.from({ length: Math.min(20, Math.floor((122*244) / (width*height))) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="bg-blue-500/20 border border-blue-500/50"
                          style={{
                             width: `${width}px`, // Scaled roughly 1:1 for this container if we assume px = cm for simplicity or scale down
                             height: `${height}px` 
                          }} 
                        />
                      ))}
                      {/* Scale warning overlay if items are too big to render nicely */}
                      {(width > 122 || height > 122) && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-red-500 text-xs font-bold">
                            Pieza &gt; Plancha
                         </div>
                      )}
                   </div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-slate-400 text-sm">
                    Esperando dimensiones...
                  </div>
                )}
                
                {width > 0 && (
                   <div className="grid grid-cols-2 w-full mt-4 gap-2">
                       <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                          <span className="text-xs text-emerald-600 block">Aprovechamiento</span>
                          <span className="text-lg font-bold text-emerald-700">{pricing.utilization}%</span>
                       </div>
                       <div className="bg-red-50 p-2 rounded border border-red-100">
                          <span className="text-xs text-red-600 block">Merma (Trash)</span>
                          <span className="text-lg font-bold text-red-700">{pricing.waste}%</span>
                       </div>
                   </div>
                )}
             </div>
          </div>
        </div>

        {showPricing && (
          <div className="border-t border-slate-200 mt-6 pt-6 animate-in slide-in-from-top-4">
             <div className="flex justify-between items-end mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Propuesta Comercial</h3>
                <div className="text-xs text-slate-400">
                   Margen aplicado: {customers.find(c => c.id === selectedCustomerId)?.type}
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Economic */}
               <PricingCard 
                 title="Económico"
                 subtitle="7 días hábiles"
                 price={basePrice}
                 icon={Calendar}
                 color="blue"
                 onSelect={() => handleCreateOrder(basePrice, '2024-03-15')}
               />
               {/* Standard */}
               <PricingCard 
                 title="Estándar"
                 subtitle="4 días hábiles"
                 price={Math.round(basePrice * 1.15)}
                 icon={Clock}
                 color="slate"
                 recommended
                 onSelect={() => handleCreateOrder(Math.round(basePrice * 1.15), '2024-03-12')}
               />
               {/* Express */}
               <PricingCard 
                 title="Express"
                 subtitle="24 horas"
                 price={Math.round(basePrice * 1.5)}
                 icon={Zap}
                 color="amber"
                 warning={plantCapacity > 80}
                 onSelect={() => handleCreateOrder(Math.round(basePrice * 1.5), '2024-03-09')}
               />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingCard({ title, subtitle, price, icon: Icon, color, recommended, warning, onSelect }: {
  title: string;
  subtitle: string;
  price: number;
  icon: React.ElementType;
  color: string;
  recommended?: boolean;
  warning?: boolean;
  onSelect?: () => void;
}) {
  
  const handleSelect = () => {
    if (warning) {
       if(confirm("¡Atención! Planta saturada. ¿Desea solicitar autorización de Gerencia?")) {
          // In a real app this would trigger an approval flow
          onSelect?.();
       }
       return;
    }
    onSelect?.();
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(p);
  };

  return (
    <div 
      className={cn(
        "bg-white p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md relative",
        recommended ? "border-blue-500 shadow-sm" : "border-transparent shadow-sm hover:border-slate-300"
      )}
      onClick={handleSelect}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Recomendado
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-slate-800">{title}</h4>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={cn("p-2 rounded-lg", warning ? "bg-red-100 text-red-600" : `bg-${color}-100 text-${color}-600`)}>
          {warning ? <AlertTriangle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-2">{formatPrice(price)}</div>
      <button className="w-full py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
        Seleccionar
      </button>
    </div>
  );
}
