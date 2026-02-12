# Dark Mode Quick Reference Guide

## 🎨 Common Dark Mode Class Patterns

### Backgrounds
```tsx
// White backgrounds
className="bg-white dark:bg-gray-dark"

// Light gray backgrounds
className="bg-gray-50 dark:bg-gray-800"
className="bg-gray-100 dark:bg-gray-700"
className="bg-gray-200 dark:bg-gray-600"

// Colored backgrounds (keep vibrant in dark mode)
className="bg-blue-600 dark:bg-blue-500"
className="bg-green-600 dark:bg-green-500"
className="bg-red-600 dark:bg-red-500"
```

### Text Colors
```tsx
// Primary text (headings, important content)
className="text-gray-900 dark:text-white"

// Secondary text (descriptions, labels)
className="text-gray-700 dark:text-gray-300"
className="text-gray-600 dark:text-gray-400"

// Muted text (hints, placeholders)
className="text-gray-500 dark:text-gray-400"
className="text-gray-400 dark:text-gray-500"
```

### Borders
```tsx
// Standard borders
className="border-gray-200 dark:border-gray-700"
className="border-gray-300 dark:border-gray-600"

// Dividers
className="divide-gray-200 dark:divide-gray-700"
```

### Interactive States
```tsx
// Hover states
className="hover:bg-gray-100 dark:hover:bg-gray-800"
className="hover:text-gray-900 dark:hover:text-white"

// Focus states
className="focus:ring-blue-500 dark:focus:ring-blue-400"
className="focus:border-blue-500 dark:focus:border-blue-400"

// Active states
className="active:bg-gray-200 dark:active:bg-gray-700"
```

### Form Elements
```tsx
// Input fields
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"

// Select dropdowns
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"

// Textareas
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"

// Placeholders
className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
```

### Cards and Containers
```tsx
// Card container
className="bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow"

// Card header
className="border-b border-gray-200 dark:border-gray-700 px-6 py-4"

// Card content
className="p-6"
```

### Badges and Tags
```tsx
// Info badge
className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"

// Success badge
className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"

// Warning badge
className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200"

// Error badge
className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
```

### Buttons
```tsx
// Primary button
className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white"

// Secondary button
className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"

// Outline button
className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"

// Ghost button
className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
```

### Modals and Dialogs
```tsx
// Modal overlay
className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70"

// Modal container
className="bg-white dark:bg-gray-dark rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"

// Modal header
className="border-b border-gray-200 dark:border-gray-700 px-6 py-4"

// Modal footer
className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800"
```

### Tables
```tsx
// Table container
className="bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"

// Table header
className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"

// Table row
className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"

// Table cell
className="px-6 py-4 text-gray-900 dark:text-white"
```

### Lists
```tsx
// List container
className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-gray-700"

// List item
className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800"
```

### Icons
```tsx
// Primary icons
className="text-gray-600 dark:text-gray-400"

// Muted icons
className="text-gray-400 dark:text-gray-500"

// Colored icons (keep vibrant)
className="text-blue-600 dark:text-blue-400"
className="text-green-600 dark:text-green-400"
className="text-red-600 dark:text-red-400"
```

## 🎯 Quick Tips

1. **Always pair background with text colors**
   ```tsx
   // ✅ Good
   className="bg-white dark:bg-gray-dark text-gray-900 dark:text-white"
   
   // ❌ Bad
   className="bg-white dark:bg-gray-dark text-gray-900"
   ```

2. **Don't forget borders**
   ```tsx
   // ✅ Good
   className="border border-gray-200 dark:border-gray-700"
   
   // ❌ Bad
   className="border border-gray-200"
   ```

3. **Use semantic colors consistently**
   - Blue for primary actions
   - Green for success
   - Yellow for warnings
   - Red for errors/danger

4. **Test hover states**
   - Always add dark mode variants for hover states
   - Ensure sufficient contrast in both modes

5. **Check form elements**
   - Inputs, selects, and textareas need special attention
   - Don't forget placeholder colors

## 🔍 Finding Missing Dark Mode Classes

Use these commands to find elements that might need dark mode:

```bash
# Find bg-white without dark mode
grep -r "bg-white(?!.*dark:)" src/

# Find text-gray without dark mode
grep -r "text-gray-[0-9]+(?!.*dark:)" src/

# Find border-gray without dark mode
grep -r "border-gray-[0-9]+(?!.*dark:)" src/
```

## 📚 Color Reference

### Gray Scale (Dark Mode)
- `gray-dark`: #122031 (main card background)
- `dark-2`: #1F2A37
- `dark-3`: #374151
- `dark-4`: #4B5563
- `dark-5`: #6B7280
- `dark-6`: #9CA3AF

### Background
- Body: `#020D1A`
- Cards: `#122031` (gray-dark)
- Inputs: `#1F2A37` (gray-800)

### Text
- Primary: `#FFFFFF` (white)
- Secondary: `#D1D5DB` (gray-300)
- Muted: `#9CA3AF` (gray-400)

---

**Quick Reference for Dark Mode Development**
