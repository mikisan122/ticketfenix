import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface Seat {
  id: string;
  row: string;
  number: number;
  isOccupied: boolean;
  category: 'VIP' | 'Preferente' | 'General';
  price: number;
}

interface InteractiveSeatMapProps {
  eventId: string;
  requiredSeats: number;
  basePrice: number;
  onSeatsSelected: (seats: Seat[]) => void;
}

export const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({ 
  eventId, 
  requiredSeats, 
  basePrice,
  onSeatsSelected 
}) => {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);

  // Generate a mock grid based on eventId to keep it consistent
  const sections = useMemo(() => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 12;
    const allSeats: Seat[] = [];

    rows.forEach((row, rowIndex) => {
      for (let i = 1; i <= seatsPerRow; i++) {
        const category = rowIndex < 2 ? 'VIP' : rowIndex < 5 ? 'Preferente' : 'General';
        const priceMultiplier = category === 'VIP' ? 2.5 : category === 'Preferente' ? 1.5 : 1;
        
        // Pseudo-random occupancy based on seat index and eventId
        const isOccupied = ((rowIndex * i) + eventId.length) % 3 === 0;

        allSeats.push({
          id: `${row}${i}`,
          row,
          number: i,
          isOccupied,
          category,
          price: basePrice * priceMultiplier
        });
      }
    });

    return allSeats;
  }, [eventId, basePrice]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.isOccupied) return;

    const isAlreadySelected = selectedSeats.find(s => s.id === seat.id);
    let newSelection: Seat[];

    if (isAlreadySelected) {
      newSelection = selectedSeats.filter(s => s.id !== seat.id);
    } else {
      // Limit to required number of seats
      if (selectedSeats.length >= requiredSeats) {
        newSelection = [...selectedSeats.slice(1), seat];
      } else {
        newSelection = [...selectedSeats, seat];
      }
    }
    
    setSelectedSeats(newSelection);
    onSeatsSelected(newSelection);
  };

  return (
    <div className="space-y-10">
      {/* Top Legend - Simplified to avoid crowding */}
      <div className="bg-black/40 p-6 rounded-[2rem] border border-white/10 space-y-6">
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand rounded-sm shadow-[0_0_8px_rgba(255,0,0,0.5)]" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Seleccionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/10 rounded-sm" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/5 rounded-sm opacity-30" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ocupado</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Preferente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">General</span>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <div className="px-6 py-2 bg-brand/10 border border-brand/20 rounded-full text-[10px] font-black text-brand uppercase tracking-widest">
            {selectedSeats.length} / {requiredSeats} Elegidos
          </div>
        </div>

        {/* Dynamic Pricing Notice */}
        <div className="flex items-center justify-center gap-2 text-white/30">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest italic">El precio puede subir según la zona elegida</span>
        </div>
      </div>

      {/* Grid Center */}
      <div className="overflow-x-auto pb-4 no-scrollbar">
        <div className="grid grid-cols-12 gap-2 min-w-[500px] justify-items-center">
          {sections.map((seat) => (
            <button
              key={seat.id}
              disabled={seat.isOccupied}
              onClick={() => handleSeatClick(seat)}
              className={`
                aspect-square w-full max-w-[40px] rounded-sm border transition-all duration-300 flex items-center justify-center text-[8px] font-black
                ${seat.isOccupied 
                  ? 'bg-white/5 border-transparent opacity-20 cursor-not-allowed' 
                  : selectedSeats.find(s => s.id === seat.id)
                    ? 'bg-brand border-brand text-white shadow-[0_0_15px_rgba(255,0,0,0.4)] scale-110 z-10'
                    : seat.category === 'VIP' 
                      ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500/60 hover:bg-yellow-500/40' 
                      : seat.category === 'Preferente'
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-500/60 hover:bg-blue-500/40'
                        : 'bg-white/10 border-white/5 text-white/40 hover:border-brand/50 hover:bg-white/20'
                }
              `}
            >
              {seat.id}
            </button>
          ))}
        </div>
      </div>

      {/* Stage at the bottom as requested */}
      <div className="relative pt-8 pb-12">
        <div className="w-[80%] mx-auto h-16 bg-linear-to-t from-gray-200 to-gray-500 rounded-b-[50%] flex items-center justify-center relative shadow-[0_-10px_40px_rgba(255,255,255,0.05)]">
           <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.05)_5px,rgba(255,255,255,0.05)_10px)] rounded-b-[50%]" />
           <span className="relative z-10 text-[11px] font-black text-black uppercase tracking-[1em] drop-shadow-sm">STAGE / ESCENARIO</span>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-4 bg-linear-to-t from-brand/20 to-transparent blur-xl rounded-full" />
      </div>

      {selectedSeats.length === requiredSeats && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem]"
        >
          <CheckCircle2 size={18} className="text-green-500" />
          <div className="flex-1">
            <p className="text-xs font-black text-green-500 uppercase tracking-widest">Selección Lista</p>
            <p className="text-[10px] text-green-500/60 font-black tracking-wider">
              ASIENTOS: {selectedSeats.map(s => s.id).join(', ')}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
