'use client';

import type { ListingSection } from '@/models/listingProduct';
import { CustomSelect } from '../../../components/CustomSelect';
import type { SelectOption } from '../../../components/CustomSelect';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PRODUCT_TAG_OPTIONS } from '@/lib/productTagOptions';
import { ReviewHubListingSection } from './ReviewHubListingSection';

export interface StepDetailsProps {
  seller: string;
  featureOptions: SelectOption[];
  redirectOptions: SelectOption[];
  features: string;
  tags: string;
  redirects: string;
  description: string;
  sellerOptions: { value: string; label: string }[];
  listingHubs: string[];
  listingSection: ListingSection;
  onListingHubsChange: (hubs: string[]) => void;
  onListingSectionChange: (section: ListingSection) => void;
  listingHubsError?: string;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string | number | '') => void;
  onClearError: (key: string) => void;
}

export function StepDetails({
  seller,
  featureOptions,
  redirectOptions,
  features,
  tags,
  redirects,
  description,
  sellerOptions,
  listingHubs,
  listingSection,
  onListingHubsChange,
  onListingSectionChange,
  listingHubsError,
  errors,
  onFieldChange,
  onClearError,
}: StepDetailsProps) {
  const inputBase = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const inputNormal = 'border-slate-300';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomSelect
          label="Procurement Seller"
          value={seller}
          onChange={(v) => onFieldChange('seller', v)}
          options={sellerOptions}
          placeholder="Select Procurement Seller"
        />
        <CustomSelect
          label="Features"
          value={features}
          onChange={(v) => onFieldChange('features', v)}
          options={featureOptions}
          placeholder="Select Features"
          multiSelect
          allowCreate
        />
        <CustomSelect
          label="Tags"
          value={tags}
          onChange={(v) => onFieldChange('tags', v)}
          options={PRODUCT_TAG_OPTIONS}
          placeholder="Select tags"
          multiSelect
        />
        <CustomSelect
          label="Redirects"
          value={redirects}
          onChange={(v) => onFieldChange('redirects', v)}
          options={redirectOptions}
          placeholder="Select one category or collection (browse URL)"
          allowCreate
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <RichTextEditor
          value={description}
          onChange={(v) => { onFieldChange('description', v); onClearError('description'); }}
          placeholder="Product description"
          hasError={!!errors.description}
          minHeight="140px"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      <ReviewHubListingSection
        listingHubs={listingHubs}
        listingSection={listingSection}
        onListingHubsChange={onListingHubsChange}
        onListingSectionChange={onListingSectionChange}
        listingHubsError={listingHubsError}
      />
    </div>
  );
}
