import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  errorType?: 'SKU_UNPUBLISHED' | 'SKU_NOT_FOUND' | 'default';
}

export default function ErrorMessage({ message, errorType = 'default' }: ErrorMessageProps) {
  const isUnpublished = errorType === 'SKU_UNPUBLISHED' || errorType === 'SKU_NOT_FOUND';
  
  return (
    <div className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 ${
      isUnpublished 
        ? 'bg-amber-50 border border-amber-200 text-amber-800' 
        : 'bg-rose-50 border border-rose-200 text-rose-700'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {isUnpublished ? (
          <XCircle className="w-5 h-5 text-amber-600" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-600" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        {isUnpublished && (
          <p className="mt-1 text-xs text-amber-600">
            This SKU is not available for analysis. Please search for a published and in-stock SKU.
          </p>
        )}
      </div>
    </div>
  );
}

