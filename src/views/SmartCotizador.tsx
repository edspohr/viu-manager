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
  
  // Fake capacity for the simulation
  const plantCapacity = 85; 

  // Handler helpers that reset pricing
  const updateField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setShowPricing(false);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerId && selectedMaterialId && width && height && quantity && campaignName) {
      setShowPricing(true);
    }
  };

  const getBasePrice = () => {
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return 0;
    // Simple mock calculation: area * price * quantity
    const area = (width * height) / 10000; // m2 or similar unit
    const base = material.pricePerUnit * area * quantity;
    return Math.round(base);
  };

  const basePrice = getBasePrice();

  const handleCreateOrder = (price: number, deliveryDate: string) => {
    if (!selectedCustomerId || !selectedMaterialId || !width || !height || !quantity || !campaignName) return;

    const newOrder: Order = {
      id: `o${Date.now()}`,
      customerId: selectedCustomerId,
      campaignName: campaignName,
      status: 'Leads', // Or 'En Cotización'
      items: [
        {
          materialId: selectedMaterialId,
          width,
          height,
          quantity,
          finishing: [] // Default empty for now
        }
      ],
      totalAmount: price,
      deliveryDate: deliveryDate, // In a real app, calculate date
      createdAt: new Date().toISOString().split('T')[0],
      fileStatus: 'Amarillo'
    };

    addOrder(newOrder);
    alert('Cotización creada exitosamente');
    
    // Reset form
    setShowPricing(false);
    setSelectedCustomerId('');
    setSelectedMaterialId('');
    setWidth(0);
    setHeight(0);
    setQuantity(1);
    setCampaignName('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
          Smart Cotizador
        </h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
           <form onSubmit={handleCalculate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Campaña</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej: Campaña Verano 2024"
                value={campaignName}
                onChange={e => updateField(setCampaignName, e.target.value)}
                required
              />
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={width || ''}
                  onChange={e => updateField(setWidth, Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alto (cm)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={height || ''}
                  onChange={e => updateField(setHeight, Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <input 
                 type="number" 
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                 value={quantity}
                 onChange={e => updateField(setQuantity, Number(e.target.value))}
                 min={1}
                 required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center justify-center gap-2"
            >
              Calcular Presupuesto
              <ArrowRight className="h-4 w-4" />
            </button>
           </form>
        </div>

        {/* Visualization area */}
        <div className="flex flex-col gap-6">
           <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative p-4 min-h-[200px]">
              {width && height ? (
                 <div className="text-center">
                    <div className="w-32 h-20 bg-blue-200 border border-blue-400 mx-auto mb-2 flex items-center justify-center text-xs text-blue-700 font-medium">
                       {width}x{height}
                    </div>
                    <p className="text-sm text-slate-500">Visualización de optimización (Simulada)</p>
                    <p className="text-xs text-slate-400 mt-1">Plancha: 122x244cm</p>
                 </div>
              ) : (
                <p className="text-slate-400 text-sm">Ingrese dimensiones para ver optimización</p>
              )}
           </div>
        </div>
      </div>

      {showPricing && (
        <div className="border-t border-slate-200 p-6 bg-slate-50 animate-in slide-in-from-top-4">
           <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Opciones de Entrega</h3>
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
