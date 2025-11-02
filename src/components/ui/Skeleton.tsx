interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  if (lines === 1) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
        ></div>
      ))}
    </div>
  );
}

export function TableSkeleton({ columns = 4, rows = 10 }: { columns?: number; rows?: number }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-6">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
      </div>
      
      {/* Table Rows Skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-6">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-16'}`} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}










