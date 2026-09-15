# Changelog

All notable changes to this fork are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — YYYY-MM-DD

First release of this fork. Based on the original `extensionOptionsMenu.uc.js` by
xiaoxiaoflood, which was last functional on older Firefox releases.

### Fixed

- **Popup came up empty / did nothing on click.** The `popupshowing` handler built a function
  at runtime via `new e.view.Function()` to reach `AddonManager` in window scope. Firefox's
  chrome CSP forbids `eval` and the `Function` constructor in `browser.xhtml`, so the handler
  threw. `AddonManager` is now imported directly via `ChromeUtils.importESModule`, with a
  `ChromeUtils.import` fallback for older builds.
- **Inline event handlers were blocked.** The loader's `_uc.createElement` calls
  `setAttribute` for every key, so `onclick` values — including one passed as a function
  literal — became inline attribute handlers and were refused under chrome CSP. All handlers
  are now attached with `addEventListener`.
- **Middle- and right-click did nothing.** Firefox routes non-primary buttons to `auxclick`
  rather than `click`. Both events are now handled, restoring enable/disable, open-homepage,
  copy-ID and uninstall.
- **`ReferenceError` on Ctrl + right-click.** The uninstall branch referenced an undeclared
  `cls`. The uninstall path is now correct, and cancelling a pending uninstall clears the
  marker instead of falling through.
- **`openURL` is no longer defined** on the browser window; replaced with
  `openTrustedLinkIn`.
- **`closeMenus` is now optional**, with a `hidePopup()` fallback.

### Changed

- `addon.__AddonInternal__.optionsType` replaced with the public `addon.optionsType`,
  falling back to the internal property. Options types are matched against
  `AddonManager.OPTIONS_TYPE_*` constants rather than bare numbers.
- `Services.wm.getEnumerator` iterated with `for…of` instead of the deprecated
  `hasMoreElements` / `getNext` pair.
- `CustomizableUI` imported directly rather than read off the most recent browser window,
  which makes `destroy()` reliable.
- State markers (`+`, `−`, `!`) written into the menuitem label instead of `::after`
  pseudo-elements, which no longer reliably target menuitem anonymous content.
- CSS classes namespaced `eom-*` and scoped to `#eom-button-popup`, so generic names like
  `.disabled` no longer collide with the browser's own styles.
- `browseDir` reveals the XPI in the file manager rather than launching it, and reports
  clearly when the file isn't at the expected profile path.
- `setDisable` clears prior state classes before applying new ones, so repeated toggling no
  longer leaves stale markers.

### Notes

- No Firefox preference changes are required. In particular,
  `security.browser_xhtml_csp.enabled` can stay at its default of `true`.
- Tested on Firefox ESR 140.15.0 with the xiaoxiaoflood loader. Untested on ESR 153 and the
  release channel.

[2.0.0]: https://github.com/YOUR_USER/YOUR_REPO/releases/tag/v2.0.0
