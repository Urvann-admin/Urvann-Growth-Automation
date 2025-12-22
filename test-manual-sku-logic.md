# Manual SKU Logic Test Cases

## Test Scenarios

### Test Case 1: No Auto-Found Products, Valid Manual SKUs
**Input:**
- SKU: `TEST123`
- Auto-found: `[]` (empty)
- Manual SKUs: `['ABI0379', 'SKU001', 'SKU002']`
- Expected: Push all 3 manual SKUs (if valid)

**Expected Behavior:**
- Case 1 applies
- All 3 manual SKUs are validated
- Only valid (published + in-stock) SKUs are pushed
- Log: `Case 1: No auto-found products. Validated X manual SKUs`

---

### Test Case 2: Some Auto-Found Products, Valid Manual SKUs
**Input:**
- SKU: `TEST123`
- Auto-found: `['AUTO1', 'AUTO2', 'AUTO3']` (3 products)
- Manual SKUs: `['ABI0379', 'SKU001']`
- Limit: 6
- Expected: Push 3 auto + 2 manual = 5 total

**Expected Behavior:**
- Case 2 applies
- 3 auto SKUs + 2 manual SKUs = 5 total
- Manual SKUs are validated before adding
- Log: `Case 2: Found 3 auto SKUs, adding 2 validated manual SKUs. Total: 5`

---

### Test Case 3: 6+ Auto-Found Products
**Input:**
- SKU: `TEST123`
- Auto-found: `['AUTO1', 'AUTO2', 'AUTO3', 'AUTO4', 'AUTO5', 'AUTO6', 'AUTO7']` (7 products)
- Manual SKUs: `['ABI0379', 'SKU001']`
- Limit: 6
- Expected: Push only 6 auto SKUs (ignore manual)

**Expected Behavior:**
- Case 3 applies
- Only first 6 auto SKUs are pushed
- Manual SKUs are ignored
- Log: `Case 3: Found 7 auto SKUs (>= limit), using only auto-found`

---

### Test Case 4: Invalid Manual SKUs
**Input:**
- SKU: `TEST123`
- Auto-found: `[]` (empty)
- Manual SKUs: `['INVALID1', 'UNPUBLISHED', 'OUTOFSTOCK']`
- Expected: None pushed (all invalid)

**Expected Behavior:**
- Case 1 applies
- All manual SKUs are validated
- Invalid ones are rejected with reasons
- Log: `Case 1: Rejected manual SKUs - INVALID1 (not found in mapping), UNPUBLISHED (unpublished), OUTOFSTOCK (out of stock)`

---

### Test Case 5: Mixed Valid/Invalid Manual SKUs
**Input:**
- SKU: `TEST123`
- Auto-found: `['AUTO1', 'AUTO2']` (2 products)
- Manual SKUs: `['VALID1', 'INVALID1', 'VALID2']`
- Limit: 6
- Expected: Push 2 auto + 2 valid manual = 4 total

**Expected Behavior:**
- Case 2 applies
- 2 auto SKUs + 2 valid manual SKUs = 4 total
- Invalid manual SKU is skipped
- Log: `Case 2: Found 2 auto SKUs, adding 2 validated manual SKUs. Total: 4`

---

## How to Test

1. **Test via Push Single API:**
   ```bash
   curl -X POST http://localhost:3000/api/frequently-bought/push-single \
     -H "Content-Type: application/json" \
     -d '{
       "sku": "YOUR_SKU",
       "limit": 6,
       "manualSkus": ["ABI0379", "SKU001"]
     }'
   ```

2. **Check Console Logs:**
   - Look for `[Push Single]` logs
   - Verify which case is applied
   - Check validation results
   - Confirm final SKUs being pushed

3. **Test via Push All Updates:**
   - Use the UI to add manual SKUs
   - Click "Push All Updates"
   - Check progress modal logs
   - Verify SKUs are merged correctly

## Expected Log Format

```
[Push Single] Manual SKUs provided: 2 - ABI0379, SKU001
[Push Single] Manual SKU mappings found: 2/2
[Push Single] Case 1: No auto-found products. Validated 2 manual SKUs, rejected 0
[Push Single] Validating ABI0379: publish="1", inventory=100, isPublished=true, isInStock=true
[Push Single] Validating SKU001: publish="1", inventory=50, isPublished=true, isInStock=true
[Push Single] ✅ SKUs being pushed (2): ABI0379, SKU001
```
