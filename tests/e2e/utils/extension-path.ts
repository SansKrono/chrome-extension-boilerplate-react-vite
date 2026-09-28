import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Fixed internal UUID assigned to the extension in Firefox (see `extensions.webextensions.uuids` in the wdio config).
 */
export const FIREFOX_EXTENSION_UUID = '00000000-0000-4000-8000-000000000001';

/**
 * Reads the gecko id from the built manifest, so it keeps working when `manifest.ts` gets a real id.
 */
export const getGeckoId = (): string => {
  const manifestPath = join(import.meta.dirname, '../../../dist/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const id = manifest.browser_specific_settings?.gecko?.id;

  if (!id) {
    throw new Error(`browser_specific_settings.gecko.id not found in ${manifestPath}`);
  }

  return id;
};

/**
 * Returns the Chrome extension path.
 * @param browser
 * @returns path to the Chrome extension
 */
export const getChromeExtensionPath = async (browser: WebdriverIO.Browser) => {
  await browser.url('chrome://extensions/');
  /**
   * https://webdriver.io/docs/extension-testing/web-extensions/#test-popup-modal-in-chrome
   * ```ts
   * const extensionItem = await $('extensions-item').getElement();
   * ```
   * The above code is not working. I guess it's because the shadow root is not accessible.
   * So I used the following code to access the shadow root manually.
   *
   *  @url https://github.com/webdriverio/webdriverio/issues/13521
   *  @url https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/786
   */
  const extensionItem = await (async () => {
    const extensionsManager = await $('extensions-manager').getElement();
    const itemList = await extensionsManager.shadow$('#container > #viewManager > extensions-item-list');
    return itemList.shadow$('extensions-item');
  })();

  const extensionId = await extensionItem.getAttribute('id');

  if (!extensionId) {
    throw new Error('Extension ID not found');
  }

  return `chrome-extension://${extensionId}`;
};

/**
 * Returns the Firefox extension path.
 * The UUID is pinned through the `extensions.webextensions.uuids` pref, because Firefox 156 rejects WebDriver
 * navigation to `about:debugging`.
 * @returns path to the Firefox extension
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getFirefoxExtensionPath = async (_browser: WebdriverIO.Browser) =>
  `moz-extension://${FIREFOX_EXTENSION_UUID}`;
