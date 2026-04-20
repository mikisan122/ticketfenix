import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div className={`overflow-hidden relative bg-white/5 rounded-[12px] ${className}`}>
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      />
    </div>
  );
};

export const EventCardSkeleton = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-video w-full rounded-[24px]" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-center pt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  );
};
