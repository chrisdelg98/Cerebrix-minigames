/**
 * Stylelint rules enforcing docs/STYLING.md §8.
 * These are not style preferences — they are the guard rails that keep the
 * token system from eroding. Loosen them only with a reason in the PR.
 */
export default {
  extends: ['stylelint-config-standard'],

  rules: {
    /* ── Tokens are the only source of values ── */

    // Hex colours live in palette.css and nowhere else (overridden below).
    'color-no-hex': true,

    'declaration-property-value-disallowed-list': {
      // Raw palette values must be consumed through semantic tokens.
      '/.*/': [/var\(\s*--raw-/],

      // Animating layout properties forces reflow on every frame and janks on
      // mobile. `all` is worse still — it transitions whatever happens to
      // change. Only compositor-friendly properties belong here.
      // docs/DESIGN_SYSTEM.md §5.2
      'transition-property': [
        /\b(all|width|height|inline-size|block-size|top|right|bottom|left|inset|margin|padding)\b/,
      ],
    },

    // No !important, ever. Use @layer ordering instead (docs/STYLING.md §1).
    'declaration-no-important': true,

    /* ── Motion: only compositor-friendly properties ── */
    // The `transition` shorthand hides what is being animated, so it is banned
    // in favour of explicit transition-property. The `animation` shorthand is
    // fine: the keyframes name says exactly what runs.
    'property-disallowed-list': ['transition'],

    /* ── CSS Modules: camelCase, matching vite.config.ts localsConvention ── */
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*$',
      {
        message:
          'Class names must be camelCase so CSS Modules expose them as s.cellInner (docs/STYLING.md §6)',
      },
    ],

    /* ── Structure ── */
    'max-nesting-depth': [2, { ignore: ['pseudo-classes'] }],
    'no-descending-specificity': null,
    'custom-property-pattern': null,

    // Token files group related custom properties with a blank line and a
    // comment. That grouping is the whole point of the file — keep it.
    'custom-property-empty-line-before': null,

    // Safari still needs -webkit-user-select for boards, and iOS Safari needs
    // the tap-highlight property, which has no unprefixed form at all.
    'property-no-vendor-prefix': [true, { ignoreProperties: ['user-select', 'tap-highlight-color'] }],
  },

  overrides: [
    {
      // The one file allowed to hold literal colour values.
      files: ['src/design/tokens/palette.css'],
      rules: {
        'color-no-hex': null,
      },
    },
    {
      // theme.css maps raw values onto semantic tokens — that is its job.
      files: ['src/design/tokens/theme.css'],
      rules: {
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      // Keyframes and the global reset legitimately need shorthand and raw resets.
      files: ['src/design/animations.css', 'src/design/global/reset.css'],
      rules: {
        'property-disallowed-list': null,
      },
    },
    {
      // The reduced-motion escape hatch is the one legitimate use of !important:
      // it must beat every animation in the app, including future ones.
      files: ['src/design/global/a11y.css'],
      rules: {
        'declaration-no-important': null,
      },
    },
    {
      // Global utilities are not CSS Modules, so they keep the conventional
      // kebab-case names the ecosystem expects (.sr-only, .anim-shake).
      files: ['src/design/global/**/*.css', 'src/design/animations.css'],
      rules: {
        'selector-class-pattern': ['^[a-z][a-z0-9]*(-[a-z0-9]+)*$'],
      },
    },
  ],
};
