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
      <div className="flex gap-6 mb-8">
        <div className="flex-1">
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 mb-8">
      <div className="flex-1">
        <StatCard 
          label="Total SKUs" 
          value={uniqueSkusCount.toLocaleString()} 
          icon={Package} 
          iconBg="bg-indigo-50" 
          iconColor="text-indigo-500" 
        />
      </div>
    </div>
  );
}

