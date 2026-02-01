# Figma AI Design Improvement Prompt

## Project Overview
This is a BudgetDiet application - a financial document analysis tool with AI-powered budget insights. The current UI uses a modern glassmorphism design with mint color palette.

## Current Design System

### Color Palette (Pantone Mint)
```css
--mint-primary: #88D4AB
--mint-light: #A7F3D0
--mint-dark: #5CB88F
--mint-glass: rgba(136, 212, 171, 0.15)
--mint-accent-1: #6EE7B7
--mint-accent-2: #34D399
```

### Typography
- Font Family: "Frank Ruhl Libre" (weights: 300, 400, 500, 700, 900)
- Body: serif font
- Headings: fontWeight 700-900

### Background
- Gradient: `linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fdf4ff 100%)`
- Floating animated orbs (mint-colored, blur-60px, opacity 0.4)

## UI Components Structure

### 1. Landing Screen (Pre-login)
```jsx
// Logo Section
- Position: Center (40vh padding-top)
- Size: 6rem font-size, fontWeight 900
- Color: var(--mint-dark)
- Clickable: Returns to initial state

// Search Input
- Glassmorphism input with search icon (🔍)
- Placeholder: "Enter 6-digit budget code"
- Max-width: 32rem
- Border-radius: 24px
- Background: rgba(255, 255, 255, 0.7)
- Backdrop-filter: blur(8px)

// Enter Button
- Mint gradient button
- Border-radius: 24px
- Hover: scale(1.05)
- Disabled when code length !== 6

// Pagination Dots
- 5 dots below input
- First dot: mint-primary color
- Others: gray with opacity
```

### 2. Post-Login Screen
```jsx
// Logo (Animated)
- Moves to top (2rem padding)
- Scales down to 0.6 (font-size: 3rem)
- Clickable to reset

// Connection Status Card
- Glass-card-mint style
- Shows: "✅ Connected as: [code]"

// Upload Section
- Glass-card container
- File input (glass style)
- Upload button (mint gradient)

// Documents List
- Each document is a collapsible glass-card
- Header: Title + Status badge (clickable toggle)
- Arrow icon rotates on expand
- Expanded view shows:
  * Total spent (large, mint-dark)
  * Period
  * AI Summary card (2-column grid)
  * Financial Advice card (2-column grid)
  * Pie Chart (spending by category)
  * Top 3 Expenses list
  * All Transactions (collapsible details)
  * Delete button
```

## Glassmorphism Styles

### Standard Glass Card
```css
background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 24px;
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
padding: 24px;
```

### Mint Glass Card
```css
background: linear-gradient(135deg, rgba(136, 212, 171, 0.15) 0%, rgba(167, 243, 208, 0.05) 100%);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 24px;
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
padding: 24px;
```

## Animations (Framer Motion)

### Logo Animation
- Initial: scale(1), paddingTop: 40vh, fontSize: 6rem
- After login: scale(0.6), paddingTop: 2rem, fontSize: 3rem
- Duration: 0.6s, ease: "easeInOut"

### Floating Orbs
- Two orbs with blur(60px)
- Orb 1: 400px, mint-primary, top-left area
- Orb 2: 350px, mint-accent-1, bottom-right area
- Animation: 20-25s duration, infinite loop, easeInOut

### Document Cards
- Fade in: opacity 0 → 1, y: 20 → 0
- Expand/Collapse: height auto, opacity transition

## Key UI Elements

### Buttons
- `.btn-mint`: Mint gradient, rounded-24px, hover scale(1.05)
- Delete button: Red (#fc8181), rounded-24px

### Inputs
- `.input-glass`: Glassmorphism, rounded-24px
- Focus: mint-primary border, shadow

### Status Badges
- Completed: mint-light background, mint-dark text
- Pending/Failed: light red background, red text

### Charts
- Pie Chart: Inner radius 60px, outer radius 100px
- Colors: Mint palette array
- Tooltip: Currency format ($X,XXX)

## Layout Structure

```
Container (max-width: 1200px, centered)
├── Orb Container (fixed, full screen, z-index: 0)
│   ├── Orb 1 (animated)
│   └── Orb 2 (animated)
└── Main Content (z-index: 1)
    ├── Logo (animated position/size)
    ├── Error Message (conditional, fade-in)
    ├── Pre-login Screen OR Post-login Screen
    │   ├── Search Input + Button
    │   └── OR
    │       ├── Connection Status
    │       ├── Upload Section
    │       └── Documents List
    │           └── Document Cards (collapsible)
```

## Request for Figma AI

Please improve this design with the following considerations:

1. **Visual Hierarchy**: Enhance the visual flow and information architecture
2. **Spacing & Layout**: Optimize spacing, padding, and grid systems
3. **Color Usage**: Refine the mint color palette application for better contrast and readability
4. **Typography Scale**: Improve font sizes, weights, and line heights for better readability
5. **Component Polish**: Enhance glassmorphism effects, shadows, and borders
6. **Micro-interactions**: Suggest subtle animations and hover states
7. **Responsive Design**: Ensure mobile-friendly layouts
8. **Accessibility**: Improve color contrast ratios and interactive element sizes
9. **Data Visualization**: Enhance chart presentation and readability
10. **Empty States**: Design better empty state screens

Please provide:
- Improved Figma design with all components
- Updated color palette if needed
- Typography scale
- Component specifications
- Spacing system
- Animation suggestions

---

## Full CSS Code

```css
/* Google Font: Frank Ruhl Libre */
/* Imported in index.html */

/* Pantone Mint Color Palette */
:root {
  --mint-primary: #88d4ab;
  --mint-light: #a7f3d0;
  --mint-dark: #5cb88f;
  --mint-glass: rgba(136, 212, 171, 0.15);
  --mint-accent-1: #6ee7b7;
  --mint-accent-2: #34d399;
}

/* Base Styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-family: "Frank Ruhl Libre", serif;
  color: #1f2937;
  background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fdf4ff 100%);
  overflow-x: hidden;
  position: relative;
}

/* Floating Animated Orbs */
.orb-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: var(--mint-primary);
  top: 10%;
  left: 10%;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: var(--mint-accent-1);
  bottom: 15%;
  right: 15%;
}

/* Glassmorphism Card Styles */
.glass-card {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.85) 100%
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.glass-card-mint {
  background: linear-gradient(
    135deg,
    rgba(136, 212, 171, 0.15) 0%,
    rgba(167, 243, 208, 0.05) 100%
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

/* Button Styles */
.btn-mint {
  background: linear-gradient(
    135deg,
    var(--mint-primary) 0%,
    var(--mint-light) 100%
  );
  border: none;
  border-radius: 24px;
  padding: 12px 32px;
  color: white;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Frank Ruhl Libre", serif;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.btn-mint:hover {
  transform: scale(1.05);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15),
    0 10px 10px -5px rgba(0, 0, 0, 0.1);
}

.btn-mint:active {
  transform: scale(0.98);
}

.btn-mint:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
}

/* Input Styles */
.input-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  padding: 14px 20px;
  font-size: 16px;
  font-family: "Frank Ruhl Libre", serif;
  color: #1f2937;
  transition: all 0.3s ease;
  width: 100%;
}

.input-glass:focus {
  outline: none;
  border-color: var(--mint-primary);
  box-shadow: 0 0 0 3px rgba(136, 212, 171, 0.2);
  background: rgba(255, 255, 255, 0.9);
}

.input-glass::placeholder {
  color: #9ca3af;
}

/* Text Styles */
.text-mint-dark {
  color: var(--mint-dark);
  font-weight: 700;
}

.text-mint-primary {
  color: var(--mint-primary);
}

/* Utility Classes */
.rounded-3xl {
  border-radius: 24px;
}

.shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: var(--mint-primary);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--mint-dark);
}
```

## Key React Component Structure

The main App component includes:
- State management for login, file upload, document expansion
- Framer Motion animations for smooth transitions
- Responsive layout with max-width container
- Conditional rendering based on login state
- Collapsible document cards with analysis results
- Pie charts for spending visualization
- Error handling and user feedback

