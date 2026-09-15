// ==UserScript==
// @name            Extension Options Menu
// @version         2.0.0
// @author          xiaoxiaoflood
// @contributor     YOUR_NAME_HERE
// @homepageURL     https://github.com/YOUR_USER/YOUR_REPO
// @downloadURL     https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/extensionOptionsMenu.uc.js
// @include         main
// @shutdown        UC.extensionOptionsMenu.destroy();
// @onlyonce
// ==/UserScript==

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// Original: https://github.com/xiaoxiaoflood/firefox-scripts (MPL-2.0)
// inspired by https://addons.mozilla.org/en-US/firefox/addon/extension-options-menu/
//
// Fork notes (v2.0.0):
//  - removed the `new Function()` trampoline (blocked by chrome CSP)
//  - all handlers attached via addEventListener, no inline attributes
//  - listens to auxclick as well as click, so middle/right buttons work
//  - AddonManager / CustomizableUI imported directly instead of via window globals
//  - state markers moved from ::after pseudo-elements onto the label text
//  - class names namespaced eom-* to avoid colliding with browser styles

UC.extensionOptionsMenu = {
  // config
  showVersion:    true,
  showHidden:     false,
  showDisabled:   true,
  enabledFirst:   true,
  blackListArray: [],

  get AddonManager() {
    delete this.AddonManager;
    let mod;
    try {
      mod = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
    } catch (e) {
      mod = ChromeUtils.import('resource://gre/modules/AddonManager.jsm');
    }
    return this.AddonManager = mod.AddonManager;
  },

  get CustomizableUI() {
    delete this.CustomizableUI;
    let mod;
    try {
      mod = ChromeUtils.importESModule('resource:///modules/CustomizableUI.sys.mjs');
    } catch (e) {
      mod = ChromeUtils.import('resource:///modules/CustomizableUI.jsm');
    }
    return this.CustomizableUI = mod.CustomizableUI;
  },

  init: function () {
    const CustomizableUI = this.CustomizableUI;

    CustomizableUI.createWidget({
      id: 'eom-button',
      type: 'custom',
      defaultArea: CustomizableUI.AREA_NAVBAR,
      onBuild: function (doc) {
        let btn = _uc.createElement(doc, 'toolbarbutton', {
          id: 'eom-button',
          label: 'Extension Options Menu',
          tooltiptext: 'Extension Options Menu',
          type: 'menu',
          class: 'toolbarbutton-1 chromeclass-toolbar-additional',
          image: UC.extensionOptionsMenu.iconURL
        });

        // middle-click the button itself -> open about:addons
        btn.addEventListener('auxclick', UC.extensionOptionsMenu.handleButtonAuxClick);

        let mp = _uc.createElement(doc, 'menupopup', {
          id: 'eom-button-popup'
        });
        btn.appendChild(mp);

        mp.addEventListener('popupshowing', UC.extensionOptionsMenu.onPopupShowing);
        mp.addEventListener('click', UC.extensionOptionsMenu.swallowEvent);
        mp.addEventListener('auxclick', UC.extensionOptionsMenu.swallowEvent);
        mp.addEventListener('contextmenu', UC.extensionOptionsMenu.swallowEvent);

        return btn;
      }
    });

    this.setStyle();
    _uc.sss.loadAndRegisterSheet(this.STYLE.url, this.STYLE.type);
  },

  swallowEvent: function (event) {
    event.preventDefault();
    event.stopPropagation();
  },

  handleButtonAuxClick: function (event) {
    if (event.button != 1)
      return;
    event.preventDefault();
    let win = event.view;
    if (win.BrowserAddonUI)
      win.BrowserAddonUI.openAddonsMgr('addons://list/extension');
    else
      win.openTrustedLinkIn('about:addons', 'tab');
  },

  onPopupShowing: function (event) {
    let self = UC.extensionOptionsMenu;
    self.AddonManager.getAddonsByTypes(['extension'])
      .then(addons => self.populateMenu(event, addons))
      .catch(Cu.reportError);
  },

  populateMenu: function (event, addons) {
    let self = UC.extensionOptionsMenu;
    let prevState;
    let popup = event.target;
    let doc = event.view.document;

    while (popup.hasChildNodes())
      popup.removeChild(popup.firstChild);

    addons.sort((a, b) => {
      let ka = (self.enabledFirst ? a.isActive ? '0' : '1' : '') + a.name.toLowerCase();
      let kb = (self.enabledFirst ? b.isActive ? '0' : '1' : '') + b.name.toLowerCase();
      return (ka < kb) ? -1 : 1;
    }).forEach(addon => {
      if (self.blackListArray.includes(addon.id) ||
          (addon.hidden && !self.showHidden) ||
          (addon.userDisabled && !self.showDisabled))
        return;

      if (self.showDisabled && self.enabledFirst && prevState !== undefined && addon.isActive != prevState)
        popup.appendChild(doc.createXULElement('menuseparator'));
      prevState = addon.isActive;

      let mi = _uc.createElement(doc, 'menuitem', {
        class: 'menuitem-iconic',
        tooltiptext: (addon.description || addon.name) + '\nID : ' + addon.id +
          '\n\nLeft-Click: Options\nMiddle-Click: Open Homepage\nRight-Click: Enable/Disable' +
          '\nCtrl + Left-Click: Reveal XPI\nCtrl + Middle-Click: Copy ID\nCtrl + Right-Click: Uninstall',
        image: addon.iconURL || self.iconURL,
        context: ''
      });

      mi._Addon = addon;
      mi.addEventListener('click', self.handleClick);
      mi.addEventListener('auxclick', self.handleClick);

      self.setDisable(mi, addon, 0);
      popup.appendChild(mi);
    });
  },

  // marker is written into the label rather than a ::after pseudo-element,
  // which no longer reliably targets menuitem anonymous content
  setLabel: function (menuitem, addon, marker) {
    let base = addon.name + (UC.extensionOptionsMenu.showVersion ? ' ' + addon.version : '');
    menuitem.setAttribute('label', marker ? base + ' ' + marker : base);
  },

  handleClick: function (event) {
    event.preventDefault();
    event.stopPropagation();

    let self = UC.extensionOptionsMenu;
    let menuitem = event.currentTarget;
    let win = event.view;

    if (!('_Addon' in menuitem))
      return;

    let addon = menuitem._Addon;
    let hasMdf = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;

    switch (event.button) {
      case 0:
        if (addon.optionsURL && !hasMdf)
          self.openAddonOptions(addon, win);
        else if (event.ctrlKey)
          self.browseDir(addon);
        break;

      case 1:
        if (addon.homepageURL && !hasMdf) {
          win.openTrustedLinkIn(addon.homepageURL, 'tab');
          self.closeMenu(menuitem, win);
        } else if (event.ctrlKey) {
          Components.classes['@mozilla.org/widget/clipboardhelper;1']
            .getService(Components.interfaces.nsIClipboardHelper)
            .copyString(addon.id);
          self.closeMenu(menuitem, win);
        }
        break;

      case 2:
        if (!hasMdf) {
          if (addon.userDisabled)
            addon.enable();
          else
            addon.disable();
          self.setDisable(menuitem, addon, 1);
        } else if (event.ctrlKey) {
          if (!Services.prompt.confirm(win, null, 'Delete ' + addon.name + ' permanently?'))
            return;

          let cls = menuitem.classList;
          if (addon.pendingOperations & self.AddonManager.PENDING_UNINSTALL) {
            addon.cancelUninstall();
            cls.remove('eom-uninstalling');
          } else {
            addon.uninstall();
            cls.remove('eom-enabling');
            cls.remove('eom-disabling');
            cls.add('eom-uninstalling');
            cls.add('eom-disabled');
            self.setLabel(menuitem, addon, '!');
          }
        }
        break;
    }
  },

  closeMenu: function (menuitem, win) {
    if (win && typeof win.closeMenus == 'function')
      win.closeMenus(menuitem);
    else
      menuitem.closest('menupopup')?.hidePopup();
  },

  setDisable: function (menuitem, addon, toggling) {
    let self = UC.extensionOptionsMenu;
    let cls = menuitem.classList;
    let marker = '';

    cls.remove('eom-enabling', 'eom-disabling', 'eom-disabled', 'eom-noOptions');

    if (addon.operationsRequiringRestart) {
      if (toggling) {
        if (addon.userDisabled && addon.isActive) {
          cls.add('eom-disabling');
          marker = '\u2212';
        } else if (!addon.userDisabled && !addon.isActive) {
          cls.add('eom-enabling');
          marker = '+';
        }
      } else if (addon.userDisabled && addon.isActive) {
        cls.add('eom-disabling');
        marker = '\u2212';
      } else if (!addon.userDisabled && !addon.isActive) {
        cls.add('eom-enabling');
        marker = '+';
      }
    } else if (toggling) {
      if (addon.isActive) {
        cls.add('eom-disabling');
        marker = '\u2212';
      } else {
        cls.add('eom-enabling');
        marker = '+';
      }
    }

    if (!addon.isActive)
      cls.add('eom-disabled');

    if (!addon.optionsURL)
      cls.add('eom-noOptions');

    self.setLabel(menuitem, addon, marker);
  },

  openAddonOptions: function (addon, win) {
    if (!addon.isActive || !addon.optionsURL)
      return;

    const AM = UC.extensionOptionsMenu.AddonManager;
    let type = Number(addon.optionsType ?? addon.__AddonInternal__?.optionsType);

    switch (type) {
      case AM.OPTIONS_TYPE_INLINE_BROWSER: // 5
        win.BrowserAddonUI.openAddonsMgr('addons://detail/' + encodeURIComponent(addon.id) + '/preferences');
        break;

      case AM.OPTIONS_TYPE_TAB: // 3
        win.switchToTabHavingURI(addon.optionsURL, true);
        break;

      default:
        for (let win2 of Services.wm.getEnumerator(null)) {
          if (win2.closed)
            continue;
          if (win2.document.documentURI == addon.optionsURL) {
            win2.focus();
            return;
          }
        }
        win.openDialog(addon.optionsURL, addon.id, 'chrome,titlebar,toolbar,centerscreen');
    }
  },

  browseDir: function (addon) {
    let file = Services.dirsvc.get('ProfD', Components.interfaces.nsIFile);
    file.append('extensions');
    file.append(addon.id + '.xpi');
    if (file.exists())
      file.reveal();
    else
      Services.prompt.alert(null, null, 'Not found:\n' + file.path);
  },

  iconURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABaUlEQVQ4y6WTW0sCQRiG/SEpVBDUVVfphbAEhWAlqYhrLWUlER2IIgrqYkEp6SBmudWiFf0SiSCwpAI7bJnprq6H/sTbGhJiEyt28fAN7zfz8DHDaABo/oPqBpovX7j4T1gOS6dNCcYiZbhOSrCHi2hugqNCwskVYNmXbxoSuPkCN3NWhCdahLLGKCfDcSBjOJiHeTeHPr8EyifCwGb9RMF0RIaHl+E+zoMJ5+AM5WALSBjaEWHayqLXm4GR/YB+Iw2iYIKTMB6WwIRE0EER9r0s+r1pGNZT6F55ReeigPb5F7TOPpMFTDCDkUAGA753GFYFdC08QedJEvkR2DbfzuntFBz+1K2ZFdCz9Ii2qQfo3Pck2MoZpVI/AqtXQAXjchIdk3fQMok/Ib6CaS0Z1c8pdlc8pqXjUOF7AqVSxDvQOq7RKERBi/UKdbDVnK3vkQWWS9Si1vstGIyxCqiBquZUXc429BfU+AL9Tqy8Q2Za8AAAAABJRU5ErkJggg==',

  setStyle: function () {
    this.STYLE = {
      url: Services.io.newURI('data:text/css;charset=UTF-8,' + encodeURIComponent(`
        @-moz-document url('${_uc.BROWSERCHROME}') {
          #eom-button-popup .eom-noOptions { color: gray; }
          #eom-button-popup .eom-disabled { color: gray; font-style: italic; }
        }
      `)),
      type: _uc.sss.USER_SHEET
    };
  },

  destroy: function () {
    this.CustomizableUI.destroyWidget('eom-button');
    _uc.sss.unregisterSheet(this.STYLE.url, this.STYLE.type);
    delete UC.extensionOptionsMenu;
  }
};

UC.extensionOptionsMenu.init();
