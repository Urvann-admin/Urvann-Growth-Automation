'use client';

import { useEffect } from 'react';
import type { ListingFormData } from '../components/ListingProductForm/types';
import type { ListingSection } from '@/models/listingProduct';
import {
  isPageReload,
  clearFormStorageOnReload,
  getPersistedForm,
  setPersistedForm,
  removePersistedForm,
} from './useFormPersistence';

export interface ListingFormPersistenceState {
  formData: ListingFormData;
  stepIndex: number;
}

/**
 * Hook for persisting listing form state across navigation
 */
export function useListingFormPersistence(
  section: ListingSection,
  formData: ListingFormData,
  stepIndex: number
) {
  const storageKey = `listing_form_${section}`;

  // Clear storage on page reload
  useEffect(() => {
    clearFormStorageOnReload(storageKey);
  }, [storageKey]);

  // Persist form state whenever it changes
  useEffect(() => {
    const state: ListingFormPersistenceState = {
      formData,
      stepIndex,
    };
    setPersistedForm(storageKey, state);
  }, [storageKey, formData, stepIndex]);

  return {
    storageKey,
    removePersistedForm: () => removePersistedForm(storageKey),
  };
}

/**
 * Get initial form state from storage or return defaults
 */
export function getInitialListingFormState(
  section: ListingSection,
  defaultFormData: ListingFormData
): {
  initialFormData: ListingFormData;
  initialStepIndex: number;
} {
  const storageKey = `listing_form_${section}`;
  
  // Clear on reload first
  clearFormStorageOnReload(storageKey);
  
  const persistedState = getPersistedForm<ListingFormPersistenceState>(storageKey);
  
  if (persistedState) {
    return {
      initialFormData: {
        ...defaultFormData,
        ...persistedState.formData,
        section, // Ensure section matches current
      },
      initialStepIndex: persistedState.stepIndex || 0,
    };
  }
  
  return {
    initialFormData: defaultFormData,
    initialStepIndex: 0,
  };
}

/**
 * Hook for managing form persistence with automatic cleanup
 */
export function useListingFormState(
  section: ListingSection,
  defaultFormData: ListingFormData
) {
  const { initialFormData, initialStepIndex } = getInitialListingFormState(section, defaultFormData);
  
  const clearPersistedState = () => {
    const storageKey = `listing_form_${section}`;
    removePersistedForm(storageKey);
  };
  
  return {
    initialFormData,
    initialStepIndex,
    clearPersistedState,
  };
}