import React, { useState } from 'react';
import { useStore } from '../store/useStore'; 
import { ArrowRight, FileUp, Sparkles, X } from 'lucide-react';
import type { Order } from '../data/mockData';
import { toast } from 'sonner';

export function SmartCotizador() {
  const { customers, materials, addOrder } = useStore();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Landing, 1: Analysis, 2: Proposal
  
  // Data State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [campaignName, setCampaignName] = useState('');
  
  // Simulation State
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisText, setAnalysisText] = useState('Iniciando...');

  const reset = () => {
    setStep(0);
    setAnalysisProgress(0);
    setSelectedCustomerId('');
    setSelectedMaterialId('');
    setWidth(0);
    setHeight(0);
    setQuantity(1);
    setCampaignName('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    startAnalysis();
  };

  const startAnalysis = () => {
    setStep(1);
    // Simulation sequence
    const sequence = [
      { t: 10, text: 'Leyendo estructura del PDF...' },
      { t: 30, text: 'Detectando vectores de corte...' },
      { t: 60, text: 'Identificando materiales...' },
      { t: 85, text: 'Optimizando geometría...' },
      { t: 100, text: '¡Listo!' }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        completeAnalysis();
        return;
      }
      setAnalysisProgress(sequence[i].t);
      setAnalysisText(sequence[i].text);
      i++;
    }, 600);
  };

  const completeAnalysis = () => {
    // Auto-fill mock data
    setCampaignName("Campaña Verano 2024");
    
    // Attempt to find "Fashion Park" or fallback
    const mockCustomer = customers.find(c => c.name.includes("Fashion")) || customers[0];
    if (mockCustomer) setSelectedCustomerId(mockCustomer.id);
    
    // Attempt to find "Foam" or fallback
    const mockMaterial = materials.find(m => m.name.includes("Foam")) || materials[0];
    if (mockMaterial) setSelectedMaterialId(mockMaterial.id);

    setWidth(120);
    setHeight(200);
    setQuantity(50);
    
    setTimeout(() => {
      setStep(2);
    }, 500);
  };

  const getPricingDetails = () => {
    const material = materials.find(m => m.id === selectedMaterialId);
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    if (!material || !customer) return { total: 0, margin: 0, waste: 0, utilization: 0, plates: 0 };

    const plateW = 122;
    const plateH = 244;
    const pieceArea = width * height;
    const plateArea = plateW * plateH;
    
    // Naive fit
    const fitW = Math.floor(plateW / width) * Math.floor(plateH / height);
    const fitH = Math.floor(plateW / height) * Math.floor(plateH / width);
    const maxPiecesPerPlate = Math.max(fitW, fitH);
    
    const usefulAreaPerPlate = maxPiecesPerPlate * pieceArea;
    const wastePerPlate = plateArea - usefulAreaPerPlate;
    const wastePercentage = maxPiecesPerPlate > 0 ? (wastePerPlate / plateArea) : 1;
    
    const platesNeeded = maxPiecesPerPlate > 0 ? Math.ceil(quantity / maxPiecesPerPlate) : 0;
    const materialCost = platesNeeded * material.pricePerUnit;

    const cutTimeMin = quantity * 2;
    const printTimeMin = quantity * 5;
    const valMin = 350;
    const operationalCost = (cutTimeMin + printTimeMin) * valMin;
    
    const baseCost = materialCost + operationalCost;

    let marginMultiplier = 1.4;
    if (customer.type === 'Complejo') marginMultiplier = 1.25;
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

  const handleCreateOrder = () => {
    if (!campaignName || !selectedCustomerId) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    const newOrder: Order = {
      id: `o${Date.now()}`,
      customerId: selectedCustomerId,
      campaignName: campaignName,
      status: 'Leads', // Starts in Leads/Cotización
      items: [
        {
          materialId: selectedMaterialId,
          width,
          height,
          quantity,
          finishing: []
        }
      ],
      totalAmount: pricing.total,
      deliveryDate: '2024-03-15', // Mock
      createdAt: new Date().toISOString().split('T')[0],
      fileStatus: 'Verde'
    };

    addOrder(newOrder);
    toast.success('Pedido creado exitosamente', {
      description: 'Se ha enviado al tablero de producción.'
    });
    reset();
  };

  // --- RENDERERS ---

  if (step === 0) {
    return (
      <div 
        className="h-[calc(100vh-140px)] w-full rounded-2xl border-4 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/10 group relative overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50'); }}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input type="file" id="file-upload" className="hidden" onChange={startAnalysis} />
        
        <div className="z-10 text-center space-y-6 animate-in zoom-in-50 duration-500">
           <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform duration-300">
             <FileUp className="h-10 w-10 text-slate-400 group-hover:text-blue-600 transition-colors" />
           </div>
           <div>
             <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Arrastra tu diseño aquí</h2>
             <p className="text-lg text-slate-500 mt-2">PDF, Illustrator, Excel o Imagen</p>
           </div>
           
           <div className="pt-8">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">O selecciona un cliente manual</span>
           </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
           <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
           <div className="absolute top-10 right-10 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
           <div className="absolute -bottom-8 left-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="h-[calc(100vh-140px)] w-full bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
         <div className="text-center space-y-8 max-w-md w-full">
            <div className="relative h-32 w-32 mx-auto">
               <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
               <div 
                 className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" 
                 style={{ animationDuration: '1.5s' }}
               />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-blue-500 animate-pulse" />
               </div>
            </div>
            
            <div className="space-y-2">
               <h2 className="text-2xl font-bold text-slate-900">{analysisText}</h2>
               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
               </div>
               <p className="text-sm text-slate-400 pt-2">Powered by Gemini 2.5 Flash</p>
            </div>
         </div>
      </div>
    );
  }

  // Step 2: Proposal
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom-8 duration-700">
       
       {/* Left Column: Visuals */}
       <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
             <h3 className="text-lg font-bold text-slate-800">Optimización de Material</h3>
             <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                {pricing.utilization}% Uso
             </span>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden flex items-center justify-center">
             {/* Visualizer */}
             <div className="relative bg-white shadow-lg border border-slate-300 w-[300px] h-[150px] flex flex-wrap content-start overflow-hidden">
                {Array.from({ length: 42 }).map((_, i) => ( // Simulated count
                  <div 
                    key={i} 
                    className="bg-blue-500/80 border border-white/50 w-[24px] h-[40px]"
                  />
                ))}
             </div>
             <p className="absolute bottom-4 text-xs text-slate-400 font-mono">
               Plancha: 122x244cm | Pieza: {width}x{height}cm
             </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
             <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Planchas</p>
                <p className="text-xl font-bold text-slate-800">{pricing.plates}</p>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Merma</p>
                <p className="text-xl font-bold text-red-500">{pricing.waste}%</p>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Cortes</p>
                <p className="text-xl font-bold text-slate-800">{quantity}</p>
             </div>
          </div>
       </div>

       {/* Right Column: Commercial */}
       <div className="w-full md:w-[400px] bg-white rounded-2xl shadow-xl border border-blue-100 p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10" />
          
          <div className="relative mb-6">
             <button onClick={reset} className="absolute top-0 right-0 p-1 text-slate-300 hover:text-slate-500"><X className="h-5 w-5"/></button>
             <h2 className="text-2xl font-bold text-slate-900 mb-1">Resumen</h2>
             <p className="text-sm text-slate-500">Basado en análisis automático</p>
          </div>

          <div className="space-y-4 flex-1">
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Campaña</label>
                <input 
                  type="text" 
                  value={campaignName} 
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full text-lg font-semibold text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Cliente</label>
                <select 
                   value={selectedCustomerId}
                   onChange={(e) => setSelectedCustomerId(e.target.value)}
                   className="w-full text-base font-medium text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                >
                   {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             
             <div className="pt-6 mt-6 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-baseline mb-2">
                   <span className="text-sm font-medium text-slate-500">Precio de Lista</span>
                   <span className="text-sm font-bold text-slate-700 line-through decoration-red-400 decoration-2">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(pricing.total * 1.1)}
                   </span>
                </div>
                <div className="flex justify-between items-baseline">
                   <span className="text-lg font-bold text-slate-900">Total Final</span>
                   <span className="text-3xl font-black text-blue-600">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(pricing.total)}
                   </span>
                </div>
                <p className="text-xs text-right text-emerald-600 font-semibold mt-1">
                   Margen proyectado: 35%
                </p>
             </div>
          </div>

          <button 
             onClick={handleCreateOrder}
             className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
             Crear Pedido
             <ArrowRight className="h-5 w-5" />
          </button>
       </div>
    </div>
  );
}
