import { Package } from 'lucide-react';
import StatCard from './StatCard';
import StatCardSkeleton from './StatCardSkeleton';

interface StatsRowProps {
  uniqueSkusCount: number;
  loading?: boolean;
}

export default function StatsRow({ 
  uniqueSkusCount, 
  loading = false
}: StatsRowProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 mb-8">
      <StatCard 
        label="Total SKUs" 
        value={uniqueSkusCount.toLocaleString()} 
        icon={Package} 
        iconBg="bg-indigo-50" 
        iconColor="text-indigo-500" 
      />
    </div>
  );
}

