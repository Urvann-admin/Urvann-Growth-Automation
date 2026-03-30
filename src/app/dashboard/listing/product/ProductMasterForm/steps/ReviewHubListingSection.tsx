'use client';

import type { ListingSection } from '@/models/listingProduct';
import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { LISTING_SECTION_TABS } from '../../../config';

export interface ReviewHubListingSectionProps {
  listingHubs: string[];
  listingSection: ListingSection;
  onListingHubToggle: (hub: string) => void;
  onListingSectionChange: (section: ListingSection) => void;
  listingHubsError?: string;
}

export function ReviewHubListingSection({
  listingHubs,
  listingSection,
  onListingHubToggle,
  onListingSectionChange,
  listingHubsError,
}: ReviewHubListingSectionProps) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Storefront hubs</h3>
      <p className="text-xs text-slate-500 mb-4">
        Select one or more hubs. Saving creates the parent in Product Master and one parent-type listing per hub
        (same rules as the former Listing → Parent listing flow). At least one product image is required.
      </p>

      <label className="block text-xs font-medium text-slate-600 mb-2">
        Hub <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {HUB_MAPPINGS.map((m) => {
          const selected = listingHubs.includes(m.hub);
          return (
            <button
              key={m.hub}
              type="button"
              onClick={() => onListingHubToggle(m.hub)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {m.hub}
            </button>
          );
        })}
      </div>
      {listingHubsError ? <p className="text-xs text-red-600 mt-2">{listingHubsError}</p> : null}

      <label className="block text-xs font-medium text-slate-600 mb-1.5 mt-5">Listing section</label>
      <select
        value={listingSection}
        onChange={(e) => onListingSectionChange(e.target.value as ListingSection)}
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      >
        {LISTING_SECTION_TABS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
