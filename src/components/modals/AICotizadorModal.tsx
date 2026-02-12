
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { X, Upload, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AICotizadorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Initialize Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

interface AnalysisResult {
  campaignName: string;
  description: string;
  materialName: string;
  width: number;
  height: number;
  quantity: number;
  estimatedCost: number;
}

export const AICotizadorModal = ({ isOpen, onClose }: AICotizadorModalProps) => {
  const { addOrder } = useStore();
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [emailText, setEmailText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    setStep('processing');
    setError(null);
    
    try {
      if (!API_KEY) {
        throw new Error("API Key not found. Check .env file.");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Act as an expert estimator for a large format printing company.
        Analyze the following customer request text and extract the technical requirements.
        
        Request: "${emailText}"
        
        Return ONLY a raw JSON object (no markdown formatting, no code blocks) with the following structure:
        {
          "campaignName": "Short catchy name for the campaign",
          "description": "Brief summary of the request",
          "materialName": "Suggested material (e.g. Foam, Vinyl, Banner, PVC)",
          "width": Number (width in cm, default to 0 if unknown),
          "height": Number (height in cm, default to 0 if unknown),
          "quantity": Number (default to 1),
          "estimatedCost": Number (Estimate in CLP, e.g. 50000)
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up markdown code blocks if present
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      setAnalysisResult(data);
      setStep('result');
    } catch (err: unknown) {
      console.error("AI Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze request.";
      setError(errorMessage);
      setStep('input');
    }
  };

  const handleCreateOrder = () => {
    if (!analysisResult) return;

    const newOrder = {
      id: `o${Date.now()}`,
      customerId: 'c1', // Defaulting to one customer for demo
      campaignName: analysisResult.campaignName,
      description: analysisResult.description,
      status: 'Por Aprobar' as const,
      items: [
        { 
          materialId: 'm1', // Defaulting for demo, ideally match based on Name
          width: analysisResult.width, 
          height: analysisResult.height, 
          quantity: analysisResult.quantity, 
          finishing: ['Corte Recto'] 
        }
      ],
      totalAmount: analysisResult.estimatedCost,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      fileStatus: 'Amarillo' as const,
    };

    addOrder(newOrder);
    onClose();
    // Reset for next time
    setTimeout(() => {
      setStep('input');
      setEmailText('');
      setAnalysisResult(null);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">AI Cotizador (Gemini 2.5)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {step === 'input' && (
            <div className="grid grid-cols-2 gap-8 h-full">
              {/* Left: Text Input */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Pegar Correo / Solicitud</label>
                <textarea
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-600 transition-all text-sm leading-relaxed"
                  placeholder="Ej: Necesito 50 carteles de 120x240 en Foam para la campaña de verano..."
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                />
              </div>

              {/* Right: Dropzone */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Archivos Adjuntos (PDF / Imágenes)</label>
                <div className="flex-1 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/20 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                    <Upload className="text-zinc-400" size={24} />
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 font-medium">Arrastra archivos aquí</p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Support: PDF, JPG, PNG</p>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white dark:bg-zinc-900 rounded-full p-4 shadow-xl border border-zinc-100 dark:border-zinc-800">
                  <Loader2 className="animate-spin text-zinc-900 dark:text-white" size={48} />
                </div>
              </div>
              <h3 className="mt-8 text-xl font-medium text-zinc-900 dark:text-white">Gemini está analizando...</h3>
              <p className="text-zinc-500 mt-2">Interpretando requerimientos técnicos y comerciales.</p>
            </div>
          )}

          {step === 'result' && analysisResult && (
            <div className="h-full flex flex-col">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Análisis Completado</h3>
                    <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">Se han detectado los siguientes parámetros.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                 <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Campaña</span>
                     <span className="text-zinc-900 dark:text-white font-medium text-lg">{analysisResult.campaignName}</span>
                     <p className="text-zinc-500 text-sm mt-1">{analysisResult.description}</p>
                 </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Material Detectado</span>
                     <span className="text-zinc-900 dark:text-white font-medium">{analysisResult.materialName}</span>
                   </div>
                   <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Medidas</span>
                     <span className="text-zinc-900 dark:text-white font-medium">{analysisResult.width} x {analysisResult.height} cm</span>
                   </div>
                   <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Cantidad</span>
                     <span className="text-zinc-900 dark:text-white font-medium">{analysisResult.quantity} Unidades</span>
                   </div>
                   <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Costo Estimado</span>
                     <span className="text-zinc-900 dark:text-white font-medium">
                       {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(analysisResult.estimatedCost)}
                     </span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
          {step === 'input' ? (
            <button 
              onClick={handleAnalyze}
              disabled={!emailText.trim()}
              className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              Analizar con Gemini <Sparkles size={16} />
            </button>
          ) : step === 'result' ? (
             <button 
              onClick={handleCreateOrder}
              className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              Crear Orden <ArrowRight size={16} />
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
