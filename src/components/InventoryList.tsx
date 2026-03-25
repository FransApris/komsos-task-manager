import { useEffect, useState } from 'react';
import { Camera, Mic, Lightbulb, Box, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeToInventory } from '../services/inventoryService';

export default function InventoryList() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToInventory(setItems);
    return () => unsubscribe();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Kamera': return <Camera size={20} />;
      case 'Audio': return <Mic size={20} />;
      case 'Lighting': return <Lightbulb size={20} />;
      default: return <Box size={20} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700 border-green-200';
      case 'IN_USE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-red-100 text-red-700 border-red-200'; // BROKEN
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Box size={18} className="text-blue-600" /> Status Peralatan Komsos
        </h3>
      </div>
      
      <div className="divide-y divide-slate-100">
        {items.map(item => (
          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                {getCategoryIcon(item.category)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
            </div>
            
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(item.status)}`}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}