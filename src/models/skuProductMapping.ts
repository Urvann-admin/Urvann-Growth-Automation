import mongoose, { Schema, Document } from 'mongoose';
import { connectDB } from '@/lib/mongodb';

// SKU to Product ID mapping interface
export interface ISkuProductMapping extends Document {
  sku: string;
  product_id: string;
  price: number;
  publish: string;
  inventory: number;
  updatedAt: Date;
}

// Define the schema
const SkuProductMappingSchema = new Schema<ISkuProductMapping>(
  {
    sku: { type: String, required: true, unique: true, index: true },
    product_id: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    publish: { type: String, default: "0", index: true },
    inventory: { type: Number, default: 0, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'skuProductMapping',
    timestamps: false,
  }
);

// Compound index for validity check (publish + inventory)
SkuProductMappingSchema.index({ publish: 1, inventory: 1 });

// Static methods
SkuProductMappingSchema.statics.findBySku = async function (sku: string) {
  await connectDB();
  return this.findOne({ sku });
};

SkuProductMappingSchema.statics.findBySkus = async function (skus: string[]) {
  await connectDB();
  return this.find({ sku: { $in: skus } });
};

SkuProductMappingSchema.statics.upsertMapping = async function (sku: string, product_id: string, price: number) {
  await connectDB();
  return this.findOneAndUpdate(
    { sku },
    { product_id, price, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

// Create model
const SkuProductMappingModel = mongoose.models.SkuProductMapping || 
  mongoose.model<ISkuProductMapping>('SkuProductMapping', SkuProductMappingSchema);

export default SkuProductMappingModel;
