# Candor Issue Actions

Findings from migrating whisper-electron-app from Angular Material to Candor.
Post these to https://github.com/pawn002/candor using Claude Code.

---

## 1. Comment on existing issue #20
### Card: review header and footer treatment
**URL:** https://github.com/pawn002/candor/issues/20

```
From whisper-electron-app migration: The subtitle question you've flagged is a concrete gap in
consuming apps. A subtitle/description line beneath the card heading (e.g. "View your past
transcriptions" under "Transcription History") is needed in almost every card. Without a formal
card__description or card-subtitle element, every consumer invents an ad-hoc class with no token
guidance for color or spacing.

Suggested addition to the card anatomy: a card__description element with
font-size: var(--font-size-sm), color: var(--color-text-subtle), placed inside [slot=header]
beneath the heading. The card stories should gain a "with description" variant so the treatment
is documented.
```

---

## 2. New issue — tokens npm package is tokens-only
**Labels:** enhancement, documentation

**Title:** `@candor-design/tokens` npm package is tokens-only; no CSS for non-Angular consumers

**Body:**
```
**Problem:** The published npm package (`@candor-design/tokens`) contains only
`tokens/candor-tokens.css` — CSS custom properties. It ships no component styles. All Candor
components exist as Angular components only.

Consumers using Candor outside Angular (plain HTML, React, Vue, Electron webviews, SSR) have no
CSS to import. They must reconstruct component classes by scraping SCSS from this repo — a copy
that diverges from Candor immediately and silently.

The package name and README give no indication that component CSS is absent. A consumer
installing `@candor-design/tokens` expecting design system styles gets only half the picture
with no warning.

**Options:**
1. Publish a companion `@candor-design/css` package with compiled component CSS — no framework
   dependency
2. Document explicitly in the package README that the package is tokens-only and that components
   require the Angular library
3. Both
```

---

## 3. New issue — Navigation and Tabs: no dark/inverse surface variant
**Labels:** enhancement, component

**Title:** Navigation and Tabs: no dark/inverse surface variant

**Body:**
```
**Problem:** `NavigationComponent` hardcodes `background-color: var(--color-bg-surface)` —
always light. `TabsComponent` similarly assumes a light surface. Neither exposes a way to render
on a dark background, even though `--color-bg-inverse` exists in the token set.

Any app with a dark header or dark tab bar must override with raw values (`--navy-800`,
`rgba(255,255,255,...)`) that bypass the semantic token layer entirely, breaking theme
responsiveness.

**Proposed fix:** A `theme` input (`'light' | 'dark'`) or a CSS modifier (`.nav--inverse`,
`.tabs--inverse`) on both components, driven by the existing `--color-bg-inverse` and
`--color-text-inverse` tokens. A `--color-border-on-inverse` token may also need adding to
complete the set.
```

---

## 4. New issue — Toast: no service or container for programmatic use
**Labels:** enhancement, component

**Title:** Toast: no service or container for programmatic use

**Body:**
```
**Problem:** `ToastComponent` is a well-built presentational primitive. But it can't be used
imperatively — there's no `ToastService` to call from arbitrary components after async actions,
and no `ToastContainerComponent` to manage the fixed-position stack of active toasts.

Every consuming app must build this queue layer themselves, producing inconsistent positioning,
stacking, and auto-dismiss behaviour across projects.

**Proposed additions:**

**`ToastService` (`providedIn: 'root'`):**
- `show(message, variant, duration?)` — adds a toast to the queue, auto-dismisses after
  `duration` ms
- `dismiss(id)` — removes a specific toast
- `toasts` signal — reactive queue for the container to render

**`ToastContainerComponent`:**
- Fixed-position outlet (bottom-center, z-index above modals)
- Iterates the service queue, renders `<app-toast>` for each
- Placed once in AppComponent; consumers never manage placement themselves

This is the same pattern Angular Material's MatSnackBar provides — the component is the visual
primitive, the service is what makes it usable from anywhere.
```

---

## How to post with Claude Code

```
Post the comment and issues from CANDOR_ISSUES.md to the pawn002/candor GitHub repo using the
GitHub MCP tools:
- Add a comment to issue #20 with the text from section 1
- Create a new issue using the title and body from section 2, with labels: enhancement, documentation
- Create a new issue using the title and body from section 3, with labels: enhancement, component
- Create a new issue using the title and body from section 4, with labels: enhancement, component
```
