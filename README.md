# Firefox Extension Options Menu

A toolbar button that drops down a list of your installed Firefox extensions, so you can
enable, disable, configure or uninstall them with a click instead of opening `about:addons`.

This is a fixed fork of xiaoxiaoflood's `extensionOptionsMenu.uc.js`, which stopped working
on current Firefox — the button appeared but the menu never opened. **Fixed and tested on
Firefox ESR 140.15.0**, with no Firefox security preferences loosened.

<!-- SCREENSHOT: the toolbar button with the dropdown open, showing the extension list -->
<img width="1192" height="489" alt="image" src="https://github.com/user-attachments/assets/abfa3804-4f6a-4899-8240-a22e452c27a5" />


## Derived from

| | |
| --- | --- |
| Original file | [`chrome/extensionOptionsMenu.uc.js`](https://github.com/xiaoxiaoflood/firefox-scripts/blob/COMMIT_SHA_HERE/chrome/extensionOptionsMenu.uc.js) |
| Original repo | [xiaoxiaoflood/firefox-scripts](https://github.com/xiaoxiaoflood/firefox-scripts) |
| Author | xiaoxiaoflood |
| License | MPL-2.0, unchanged |

## Interactions

| Click | Action |
| --- | --- |
| Left | Open the extension's options |
| Middle | Open the extension's homepage |
| Right | Enable / disable |
| Ctrl + Left | Reveal the XPI in the file manager |
| Ctrl + Middle | Copy the extension ID |
| Ctrl + Right | Uninstall |

Middle-clicking the toolbar button itself opens `about:addons`.

## Compatibility

| Channel | Version | Status |
| --- | --- | --- |
| ESR 140 | 140.15.0 | ✅ Works — tested by the maintainer |
| ESR 153 | 153.2.0 | ❓ Not tested |
| Release | 155+ | ❓ Not tested |
| ESR 115 | 115.40.0 | ❓ Not tested — unlikely to work |

If you run this on something not listed, please [open an issue](../../issues) with your
`about:support` version string and whether it worked. Reports from the release channel are
especially useful.

Note that from Firefox 155 onward Mozilla ships a new major version every two weeks rather
than every four, so the release channel is likely to break scripts like this more often than
it used to.

## Installation

You need a userChromeJS loader first — this script will not run on its own, and it will not
run under MrOtherGuy's `fx-autoconfig`, which uses a different API.

### Step 1 — Install the loader

Easiest path: run the installer from
**[onemen/firefox-scripts → Releases](https://github.com/onemen/firefox-scripts/releases)**.
That repo packages xiaoxiaoflood's loader with an installer and an in-browser updater, and is
actively maintained.

To do it by hand instead, take `config.zip` and `chrome.zip` from
[xiaoxiaoflood/firefox-scripts#343](https://github.com/xiaoxiaoflood/firefox-scripts/issues/343)
and place:

| File | Destination |
| --- | --- |
| `config.js` | Firefox install directory — e.g. `C:\Program Files\Mozilla Firefox\` |
| `config-prefs.js` | `<install dir>\defaults\pref\` |
| `userChrome.jsm`, `xPref.jsm`, `chrome.manifest`, etc. | `<profile>\chrome\utils\` |

Writing to the install directory needs administrator rights on Windows.

### Step 2 — Find your profile folder

Open `about:profiles` and use the **Root Directory** path of the profile you're using. On
Windows it looks like `%APPDATA%\Mozilla\Firefox\Profiles\xxxxxxxx.default-release\`.

Create a `chrome` subfolder there if it doesn't exist.

### Step 3 — Install this script

Download **[`extensionOptionsMenu.uc.js`](../../raw/main/extensionOptionsMenu.uc.js)** and put
it in:

```
<profile>\chrome\extensionOptionsMenu.uc.js
```

`chrome\`, **not** `chrome\utils\`. That folder is for the loader only.

### Step 4 — Clear the startup cache

Open `about:support`, click **Clear startup cache…**, confirm the restart.

This is only needed after a loader change. Replacing just this script later needs nothing
more than a normal restart.

### Step 5 — Add the button

Right-click an empty part of the toolbar → **Customize Toolbar** → drag **Extension Options
Menu** where you want it.


### Not working?

Open the Browser Console with Ctrl+Shift+J (set `devtools.chrome.enabled` to `true` in
`about:config` first) and click the button. Any error naming `extensionOptionsMenu.uc.js`
tells you what failed — include it if you open an issue.

## Configuration

Edit the block at the top of the script:

| Option | Default | Effect |
| --- | --- | --- |
| `showVersion` | `true` | Append the version number to each entry |
| `showHidden` | `false` | Include hidden extensions |
| `showDisabled` | `true` | Include disabled extensions |
| `enabledFirst` | `true` | Sort enabled extensions above disabled ones |
| `blackListArray` | `[]` | Extension IDs to omit entirely |

Save and restart Firefox to apply.

## What was fixed

Three things the original relied on that current Firefox no longer permits:

1. **`new Function()` at runtime.** The popup reached `AddonManager` by building a function in
   window scope. Firefox's chrome CSP forbids `eval` and the `Function` constructor in
   `browser.xhtml`, so the handler threw and the menu came up empty. `AddonManager` is now
   imported with `ChromeUtils.importESModule`.
2. **Inline event-handler attributes**, also CSP-blocked. Everything uses `addEventListener`
   now.
3. **`click` for non-primary buttons.** Firefox routes middle and right clicks to `auxclick`.
   Both are handled, which restores enable/disable, open-homepage, copy-ID and uninstall.

Plus a `ReferenceError` in the uninstall path, the removed `openURL` global, and some
deprecated API use. Full detail in [CHANGELOG.md](CHANGELOG.md).

**No preference changes are required** — in particular you do *not* need to set
`security.browser_xhtml_csp.enabled` to `false`, which older advice for this script suggested.

## Credits

Original script by **xiaoxiaoflood**. Loader maintenance by **onemen** and **117649**.

Licensed under the [Mozilla Public License 2.0](LICENSE), same as the original.
