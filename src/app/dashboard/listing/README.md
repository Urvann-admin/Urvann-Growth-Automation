# Listing Module - Modular Architecture

## Overview

The listing module has been refactored into a modular architecture with shared components and feature-specific directories.

## Directory Structure

```
listing/
├── shared/                      # Shared components across all listing features
│   ├── ViewTable/              # Table view components
│   │   ├── SearchBar.tsx       # Search bar with entity count
│   │   ├── Pagination.tsx      # Pagination controls
│   │   └── index.ts
│   ├── EditModal/              # Modal components
│   │   ├── ModalContainer.tsx  # Modal wrapper with backdrop
│   │   ├── ModalHeader.tsx     # Modal header with title and close
│   │   ├── ModalFooter.tsx     # Modal footer with action buttons
│   │   ├── ModalSection.tsx    # Section with title for grouping fields
│   │   └── index.ts
│   └── index.ts
│
├── category/                    # Category feature
│   ├── ViewCategories/         # View categories page (modular)
│   │   ├── ViewCategories.tsx  # Main component
│   │   ├── CategoryTable.tsx   # Table display
│   │   ├── EditCategoryModal.tsx # Edit modal
│   │   └── index.ts
│   ├── ViewCategories.tsx      # Re-export for backward compatibility
│   ├── CategoryMasterForm/     # Category creation form
│   └── page.tsx
│
├── product/                     # Product feature
│   ├── ViewParents/            # View parent products (modular)
│   │   ├── ViewParents.tsx     # Main component
│   │   ├── ParentTable.tsx     # Table display
│   │   ├── EditParentModal.tsx # Edit modal
│   │   └── index.ts
│   ├── ViewParents.tsx         # Re-export for backward compatibility
│   ├── ProductMasterForm/      # Product creation form
│   └── page.tsx
│
├── components/                  # Shared form components
│   ├── CustomSelect.tsx
│   ├── ListingContent.tsx
│   ├── ListingSidebar.tsx
│   ├── ListingTopBar.tsx
│   └── index.ts
│
├── hooks/
│   └── useListingState.ts
│
├── config.ts
├── page.tsx
└── README.md (this file)
```

## Shared Components

### ViewTable Components

#### SearchBar
```tsx
<SearchBar
  value={search}
  onChange={setSearch}
  onSubmit={handleSubmit}
  placeholder="Search..."
  totalCount={100}
  entityName="Products"
/>
```

**Props:**
- `value`: Current search value
- `onChange`: Callback when search changes
- `onSubmit`: Form submit handler
- `placeholder`: Input placeholder text
- `totalCount`: Total number of items (optional)
- `entityName`: Name of entity being searched (optional)

#### Pagination
```tsx
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={handlePageChange}
/>
```

**Props:**
- `currentPage`: Current page number
- `totalPages`: Total number of pages
- `onPageChange`: Callback when page changes

### EditModal Components

#### ModalContainer
Provides the modal backdrop and container with proper z-index and styling.

```tsx
<ModalContainer isOpen={isOpen} onClose={onClose}>
  {/* Modal content */}
</ModalContainer>
```

#### ModalHeader
Consistent header with title and close button.

```tsx
<ModalHeader title="Edit Product" onClose={onClose} />
```

#### ModalFooter
Consistent footer with Cancel and Save buttons, including loading state.

```tsx
<ModalFooter
  onCancel={onClose}
  onSave={onSave}
  saving={saving}
  saveLabel="Save changes"
  cancelLabel="Cancel"
/>
```

#### ModalSection
Groups related fields with a section title.

```tsx
<ModalSection title="Basic Information">
  {/* Form fields */}
</ModalSection>
```

## Feature-Specific Components

### Category

#### CategoryTable
Displays categories in a table with edit actions.

```tsx
<CategoryTable categories={categories} onEdit={handleEdit} />
```

#### EditCategoryModal
Modal for editing category details.

```tsx
<EditCategoryModal
  isOpen={isOpen}
  editForm={editForm}
  saving={saving}
  onClose={onClose}
  onSave={onSave}
  onChange={setEditForm}
/>
```

### Product

#### ParentTable
Displays parent products with SKU, plant info, and edit actions.

```tsx
<ParentTable items={items} onEdit={handleEdit} />
```

#### EditParentModal
Modal for editing parent product details with sections for basics, pricing, and categories.

```tsx
<EditParentModal
  isOpen={isOpen}
  editForm={editForm}
  saving={saving}
  categories={categories}
  sellers={sellers}
  onClose={onClose}
  onSave={onSave}
  onChange={setEditForm}
/>
```

## Benefits of Modular Architecture

### 1. **Reusability**
- Shared components reduce code duplication
- Consistent UI/UX across features
- Easy to maintain and update

### 2. **Separation of Concerns**
- Each component has a single responsibility
- Business logic separated from presentation
- Easier to test and debug

### 3. **Scalability**
- Easy to add new features (e.g., ViewSuppliers)
- New features can reuse existing components
- Clear patterns for new developers

### 4. **Maintainability**
- Changes to shared components propagate automatically
- Bug fixes in one place benefit all features
- Easier to refactor and improve

### 5. **Type Safety**
- Clear TypeScript interfaces for all components
- Props are well-documented and type-checked
- Reduces runtime errors

## Adding a New Feature

To add a new listing feature (e.g., "Suppliers"):

1. **Create feature directory:**
   ```
   listing/supplier/
   ├── ViewSuppliers/
   │   ├── ViewSuppliers.tsx
   │   ├── SupplierTable.tsx
   │   ├── EditSupplierModal.tsx
   │   └── index.ts
   ├── ViewSuppliers.tsx (re-export)
   ├── SupplierMasterForm/
   └── page.tsx
   ```

2. **Use shared components:**
   ```tsx
   import { SearchBar, Pagination, ModalContainer, ModalHeader, ModalFooter, ModalSection } from '../../shared';
   ```

3. **Create feature-specific components:**
   - Table component for display
   - Modal component for editing
   - Main component that orchestrates everything

4. **Follow existing patterns:**
   - State management
   - API calls
   - Error handling
   - Loading states

## Migration Notes

- Old files (`ViewCategories.tsx`, `ViewParents.tsx`) now re-export from modular directories
- Backward compatibility maintained
- No breaking changes to imports
- Gradual migration possible

## Best Practices

1. **Keep shared components generic** - Don't add feature-specific logic
2. **Use TypeScript interfaces** - Document all props
3. **Follow naming conventions** - `[Feature]Table`, `Edit[Feature]Modal`
4. **Extract reusable logic** - Create custom hooks when needed
5. **Test components independently** - Each component should be testable in isolation

## Future Improvements

- [ ] Add unit tests for shared components
- [ ] Create Storybook stories for documentation
- [ ] Add loading skeletons for better UX
- [ ] Implement optimistic updates
- [ ] Add bulk operations support
- [ ] Create generic table component with sorting/filtering
