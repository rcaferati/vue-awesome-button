# Vue Awesome Button Architecture

## Summary

`@rcaferati/vue-awesome-button` is a Vue 3 package that should be behaviorally equivalent to `@rcaferati/react-awesome-button` `8.1.0` on the web, while exposing a Vue-native API and implementation model.

This document is the canonical build spec for the package. It exists to make implementation decision-complete before code is written.

Behavioral source of truth:

- `/Users/rcaferati/github/public-components/AGENTIC_AWESOME_BUTTON.md` for the core button system
- `/Users/rcaferati/github/public-components/react-awesome-button` for current web-specific behavior, public surface, theme set, Storybook structure, and release expectations

The package goal is not API identity with React. The package goal is:

- same 3D button visuals
- same press, release, progress, and social behavior
- same theme family and class contract
- same product-level capabilities
- Vue-first ergonomics

## Canonical Package Shape

- Package name: `@rcaferati/vue-awesome-button`
- Framework target: Vue 3 only
- Module target: ESM-first with CJS compatibility only if the build toolchain makes it practical without degrading DX
- Public exports:
  - `AwesomeButton`
  - `AwesomeButtonProgress`
  - `AwesomeButtonSocial`
  - `AwesomeButtonPlugin`
  - public TypeScript types for props, emits payloads, theme names, button variants, button sizes, share types, share payloads, and popup dimensions
- No Vue 2 support
- No Nuxt wrapper in v1

## Product Scope

The Vue package must ship the same three product layers as the React package:

1. `AwesomeButton`
2. `AwesomeButtonProgress`
3. `AwesomeButtonSocial`

The Vue package must also ship the same 10 bundled themes:

- `amber`
- `blue`
- `bojack`
- `bruce`
- `c137`
- `eric`
- `flat`
- `indigo`
- `red`
- `rickiest`

## Vue-Native Public API

### React-to-Vue mapping

| React package | Vue package |
| --- | --- |
| `children` | default slot |
| `before` / `after` / `extra` props | named slots: `before`, `after`, `extra` |
| `onPress` / `onPressed` / `onReleased` props | emits: `press`, `pressed`, `released` |
| `containerProps` | `$attrs` forwarded to rendered root element |
| `className` / `style` | native Vue `class` / `style` bindings |
| `element` | `as` prop (`string \| Component`) |
| `cssModule` | `theme` prop + imported theme CSS |

The following remain first-class props:

- `active`
- `disabled`
- `visible`
- `placeholder`
- `textTransition`
- `between`
- `ripple`
- `moveEvents`
- `href`
- `type`
- `size`

### `AwesomeButton`

Props:

- `type?: ButtonVariant`
- `size?: ButtonSize | null`
- `active?: boolean`
- `disabled?: boolean`
- `visible?: boolean`
- `placeholder?: boolean`
- `textTransition?: boolean`
- `between?: boolean`
- `ripple?: boolean`
- `moveEvents?: boolean`
- `href?: string | null`
- `as?: string | Component`
- `theme?: ThemeName | null`

Slots:

- `before`
- default
- `after`
- `extra`

Emits:

- `press`
- `pressed`
- `released`

Behavior:

- emits `press` only on successful activation
- emits `pressed` after press-in settles
- emits `released` after visual release is cleared
- if `href` is present and no custom root suppresses native semantics, the component behaves anchor-like

### `AwesomeButtonProgress`

`AwesomeButtonProgress` inherits `AwesomeButton` except it does not expose public `active`.

Additional props:

- `loadingLabel?: string`
- `resultLabel?: string`
- `releaseDelay?: number`
- `showProgressBar?: boolean`
- `progressLoadingTime?: number`

Slots:

- `before`
- default
- `after`
- `extra`

Emits:

- `press`
- `pressed`
- `released`

`press` signature:

- emit `press` as `(event, next) => void`
- `next(true)` triggers success completion
- `next(false, label?)` triggers error completion with optional label override

### `AwesomeButtonSocial`

`AwesomeButtonSocial` inherits `AwesomeButton`.

Additional props:

- `sharer?: SharerConfig`
- `dimensions?: { width: number; height: number }`

Slots:

- `before`
- default
- `after`
- `extra`

Emits:

- `press`
- `pressed`
- `released`

Share precedence must match React exactly:

1. if the consumer is listening to `press`, the component emits and does not run built-in share behavior
2. if `href` is provided, native navigation wins
3. if `navigator.share` is available and suitable, use it
4. otherwise build a popup/direct URL fallback

## Styling And Theming Contract

### Internal class contract

The Vue package must keep the same internal visual class contract as the React package so the styling model remains stable across frameworks.

Canonical classes:

- root: `aws-btn`
- elements:
  - `aws-btn__wrapper`
  - `aws-btn__content`
  - `aws-btn__label`
  - `aws-btn__progress`
  - `aws-btn__bubble`
- state/modifier classes:
  - `aws-btn--visible`
  - `aws-btn--placeholder`
  - `aws-btn--disabled`
  - `aws-btn--between`
  - `aws-btn--auto`
  - `aws-btn--fixed`
  - `aws-btn--fill`
  - `aws-btn--left`
  - `aws-btn--middle`
  - `aws-btn--right`
  - `aws-btn--active`
  - `aws-btn--releasing`
  - `aws-btn--progress`
  - `aws-btn--progress-bar-hidden`
  - `aws-btn--start`
  - `aws-btn--end`
  - `aws-btn--errored`
  - type modifiers such as `aws-btn--primary`, `aws-btn--secondary`, `aws-btn--danger`, `aws-btn--link`, social type modifiers, and size modifiers

### Public theming model

Vue will not reproduce React’s `cssModule` API.

The primary public theming model is:

- base styles import:
  - `@rcaferati/vue-awesome-button/styles.css`
- theme styles import:
  - `@rcaferati/vue-awesome-button/themes/theme-blue.css`
  - and equivalent files for the other 9 themes
- runtime `theme` prop:
  - `<AwesomeButton theme="blue" />`

The component must add a theme marker class such as:

- `aws-btn--theme-blue`

Theme CSS must override the same CSS custom properties under that marker class. This preserves parity while allowing multiple themes to coexist without CSS-module mapping objects.

Base styles alone must render a valid default button. Theme CSS is an enhancement layer, not a requirement for basic rendering.

### CSS custom property surface

The Vue package should preserve the same CSS custom property model used by the React package:

- geometry values
- font values
- raise/pressed depth
- transform/release/progress timing
- type colors
- social colors
- placeholder and disabled colors

This keeps visual parity and makes theme-porting mechanical instead of interpretive.

## Behavioral Parity Requirements

### Base button

The following behavior is required in v1:

- 3-layer visual structure:
  - shadow plane
  - fixed bottom shell
  - moving face
- immediate press-in on pointer/touch/key activation
- explicit `releasing` phase for interrupted partial presses
- same pointer zone classes: `left`, `middle`, `right`
- same fixed-size vs auto-size behavior
- integer pixel snapping for auto-width content and label measurement
- controlled `active`
- disabled and placeholder behavior
- anchor mode when `href` is present
- optional ripple effect
- string-only `textTransition`

### Progress wrapper

Required parity:

- one-shot guarded lifecycle
- no re-entry while busy
- loading/result overlay text
- `showProgressBar`
- runtime `progressLoadingTime`
- dark translated progress layer behind content when enabled
- full hiding of original foreground during progress
- fast completion fill on `next()`
- delayed reset using `releaseDelay`

### Social wrapper

Required parity:

- same supported share types:
  - `facebook`
  - `twitter`
  - `pinterest`
  - `linkedin`
  - `reddit`
  - `whatsapp`
  - `messenger`
  - `mail`
  - `instagram`
- same metadata fallback behavior:
  - current page URL
  - document title
  - `og:image`
- same popup-centering model
- same distinction between:
  - actual supported sharer types
  - visual-only types that exist in themes but do not imply built-in share URLs

## Internal Package Architecture

The initial package structure must be:

```text
src/
  components/
    AwesomeButton.vue
    AwesomeButtonProgress.vue
    AwesomeButtonSocial.vue
  composables/
    useButtonPress.ts
    useAutoWidthSnap.ts
    useTextTransition.ts
    useProgressLifecycle.ts
    useSharer.ts
  styles/
    styles.css
    base/
    themes/
  plugin.ts
  index.ts
```

### Component responsibilities

- `AwesomeButton.vue`
  - renders the canonical DOM/class structure
  - owns root semantics, active/releasing states, slots, anchor/custom-element rendering, ripple, auto-width sync, and text transition
- `AwesomeButtonProgress.vue`
  - composes `AwesomeButton`
  - owns busy guarding, overlay text, progress timing CSS vars, and reset sequencing
- `AwesomeButtonSocial.vue`
  - composes `AwesomeButton`
  - owns share payload generation and default share behavior

### Composable responsibilities

- `useButtonPress.ts`
  - press state machine
  - release transition handling
  - pointer zone tracking
  - keyboard activation normalization
- `useAutoWidthSnap.ts`
  - integer width measurement
  - `ResizeObserver` integration
  - `document.fonts` remeasurement when available
- `useTextTransition.ts`
  - string-only scramble transition
  - whitespace preservation
  - RAF cleanup
- `useProgressLifecycle.ts`
  - one-shot busy guarding
  - `next()` success/error resolution
  - release-delay reset
- `useSharer.ts`
  - share payload builder
  - popup dimension normalization
  - mobile/native share fallback logic

## Vue Framework Best Practices To Follow

- Use Composition API throughout
- Prefer `script setup` for components unless a lower-level `defineComponent` form is needed for precise generic typing
- Keep DOM reads and browser globals behind client-only guards
- Use `inheritAttrs: false` only if required to control root forwarding cleanly
- Forward `$attrs` to the rendered root element
- Expose typed `defineEmits`
- Use slots, not prop-based node injection, for content placement
- Keep SSR-safe rendering as a first-class requirement

DOM-only features that must be client-guarded:

- `ResizeObserver`
- `document.fonts`
- `window.open`
- `navigator.share`
- direct document metadata reads
- layout measurement APIs

## Build, Tooling, And Packaging

Tooling choices to lock:

- Vite library mode for package builds
- TypeScript-first source
- `vue-tsc` for declaration generation and template type safety
- Vitest + Vue Test Utils for tests
- Storybook for Vue 3 + Vite

Package outputs should include:

- main ESM entry
- type declarations
- base CSS
- theme CSS files

Publish expectations:

- scoped npm package: `@rcaferati/vue-awesome-button`
- public access
- README and Storybook aligned before first publish

## Documentation And Storybook Parity

The Vue README should mirror the React README structure, rewritten for Vue syntax:

- installation
- base usage
- theme usage
- sizes and auto width
- text transition
- progress flows
- social flows
- props/events/slots tables

Storybook must mirror the same top-level sections:

- `Components`
- `Icons`
- `Themes`

The `Themes` section must expose all 10 themes as one page per theme, showing the same core button gallery pattern used by the React package.

## Implementation Phases

### Phase 1: Foundation

- scaffold package tooling
- configure Vite library build, Vitest, Storybook, and `vue-tsc`
- port base CSS contract
- port one reference theme: `blue`
- implement `AwesomeButton`

### Phase 2: Base behavior parity

- integer auto-width snapping
- explicit release phase
- ripple
- string-only `textTransition`
- fixed-size and auto-size parity

### Phase 3: Progress parity

- implement `AwesomeButtonProgress`
- add `showProgressBar`
- add `progressLoadingTime`
- complete guarded lifecycle and reset sequencing

### Phase 4: Social parity

- implement `AwesomeButtonSocial`
- port sharer utility behavior
- support the full share-type matrix

### Phase 5: Theme and docs completion

- port the remaining 9 themes
- add full Storybook parity
- complete README
- prepare publish metadata and package exports

## Test Plan

Required tests:

- base press and release transitions
- partial press cancellation and interrupted release behavior
- controlled `active`
- auto-width integer snapping and content changes
- string-only `textTransition`
- progress success flow
- progress error flow
- `showProgressBar={false}` equivalent behavior
- runtime `progressLoadingTime`
- social share payload generation
- social fallback order
- SSR-safe rendering with no early browser-global access
- Storybook compile/build coverage
- package build outputs and type exports

## Assumptions

- `@rcaferati/vue-awesome-button` is the intended npm package name
- the Vue package should match React behavior, not React API shape
- Vue-native ergonomics take priority when a direct API port would feel unidiomatic
- `theme` prop + theme CSS imports is the primary theming model
- this file is the root truth document and should be written before implementation starts
