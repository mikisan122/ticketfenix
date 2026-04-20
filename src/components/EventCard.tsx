import { Calendar, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import { motion } from 'motion/react';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="card-sleek flex flex-col group h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-brand text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-[2px]">
            {event.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow gap-2">
        <h3 className="text-lg font-bold leading-tight group-hover:text-brand transition-colors">
          {event.title}
        </h3>
        
        <div className="text-text-muted text-[12px] font-medium">
          {event.date} | {event.location}
        </div>

        <div className="flex items-center justify-between pt-4 mt-auto">
          <span className="text-brand font-bold text-lg">${event.price}</span>
          <Link 
            to={`/evento/${event.id}`}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            Comprar
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
