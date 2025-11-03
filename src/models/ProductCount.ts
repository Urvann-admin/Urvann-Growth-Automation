import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCount extends Document {
  category: string;
  substore: string;
  count: number;
  lastUpdated: Date;
  isStale: boolean; // Flag to indicate if data needs refresh
}

const ProductCountSchema = new Schema<IProductCount>({
  category: {
    type: String,
    required: true,
    index: true,
  },
  substore: {
    type: String,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isStale: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for fast lookups
ProductCountSchema.index({ category: 1, substore: 1 }, { unique: true });

// Index for finding stale data
ProductCountSchema.index({ lastUpdated: 1, isStale: 1 });

export default mongoose.models.ProductCount || mongoose.model<IProductCount>('ProductCount', ProductCountSchema);

