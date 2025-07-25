# Additional Medium and Low Priority Issues

## Medium Priority Issues (Click to Expand)

### MED-001: Inefficient Array Type Checking
```typescript
// source/index.ts (line ~500)
const isNonEmptyArray = <T = unknown>(value: unknown): value is [T, ...T[]] => 
    isArray(value) && value.length > 0;

const isEmptyArray = (value: unknown): value is [] => 
    isArray(value) && value.length === 0;
// ISSUE: Both call isArray() separately, duplicating type checks
```

### MED-002: Generic Type Safety Issues
```typescript
// source/index.ts (line ~700)
const isWeakRef = (value: unknown): value is WeakRef<any> => 
    isObjectOfType('WeakRef')(value);
// ISSUE: Using 'any' type masks potential type safety issues

// source/index.ts (line ~850)
const isTypedArray = (value: unknown): value is TypedArray => 
    typeTypedArrays.includes(getObjectType(value) as any);
// ISSUE: Unsafe type assertion
```

### MED-003: Missing Bounds Validation
```typescript
// source/index.ts (line ~1000)
const isPropertyKey = (value: unknown): value is PropertyKey => 
    isString(value) || isNumber(value) || isSymbol(value);
// ISSUE: Doesn't validate that numbers are valid array indices (0 to 2^53-1)
```

### MED-004: Performance in Hot Paths
```typescript
// source/index.ts (line ~450)
const isArrayLike = <T = unknown>(value: unknown): value is ArrayLike<T> => {
    if (!is.object(value)) return false;
    
    const length = (value as ArrayLike<T>).length;
    // Multiple type assertions and property accesses
    return is.number(length) && length >= 0 && length <= Number.MAX_SAFE_INTEGER;
};
```

### MED-005: Regex Compilation Overhead
```typescript
// source/index.ts (line ~950)
const hexColorRegex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;
const isHexColor = (value: unknown): value is string => 
    isString(value) && hexColorRegex.test(value);
// ISSUE: Regex compiled on module load even if never used
```

## Low Priority Issues

### LOW-001: Incomplete Type Guards
```typescript
// source/index.ts
const isMap = (value: unknown): value is Map<unknown, unknown> => 
    isObjectOfType('Map')(value);
// Could be more specific: Map<K, V> with generic parameters
```

### LOW-002: Missing JSDoc Examples
```typescript
/**
 * Check if value is a plain object
 */
const isPlainObject = <Value = unknown>(value: unknown): value is Record<PropertyKey, Value> => {
    // Missing @example tags for usage
```

### LOW-003: Inconsistent Naming
```typescript
is.nan = isNaN;  // Lowercase
is.NaN = isNaN;  // Uppercase - both exported
```

### LOW-004: No Async Type Checks
```typescript
// Missing checks for:
// - AsyncIterable
// - AsyncGenerator
// - Async functions specifically
```

### LOW-005: Limited Collection Utilities
```typescript
// Has isMap, isSet, but missing:
// - isNonEmptyMap
// - isNonEmptySet
// - Collection size checks
```

### LOW-006: No Performance Hints
```typescript
// No documentation about performance characteristics
// e.g., which checks are fast (typeof) vs slow (toString)
```

### LOW-007: Missing Common Patterns
```typescript
// No built-in checks for:
// - isEmail (though arguably out of scope)
// - isUUID
// - isJSON
// - isBase64
```

### LOW-008: Type Inference Limitations
```typescript
const isNumberArray = (value: unknown): value is number[] => 
    isArray(value) && value.every(isNumber);
// Could provide better type inference with generics
```

### LOW-009: No Composition Helpers
```typescript
// Users must manually compose:
const isStringOrNumber = (value: unknown): value is string | number => 
    isString(value) || isNumber(value);
// Could provide: is.oneOf(isString, isNumber)
```

### LOW-010: Missing Debug Mode
```typescript
// No way to get detailed information about why a check failed
// Useful for development/debugging
```