import { config as baseConfig } from './wdio.conf.js';
import {
  FIREFOX_EXTENSION_UUID,
  getChromeExtensionPath,
  getFirefoxExtensionPath,
  getGeckoId,
} from '../utils/extension-path.js';
import { IS_CI, IS_FIREFOX } from '@extension/env';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const extName = IS_FIREFOX ? '.xpi' : '.zip';
const extensions = await readdir(join(import.meta.dirname, '../../../dist-zip'));
const latestExtension = extensions.filter(file => extname(file) === extName).at(-1);
const extPath = join(import.meta.dirname, `../../../dist-zip/${latestExtension}`);
const bundledExtension = (await readFile(extPath)).toString('base64');

const chromeCapabilities = {
  browserName: 'chrome',
  /**
   * Google Chrome 137+ ignores `--load-extension`, which is how chromedriver installs `goog:chromeOptions.extensions`,
   * so on the CI runner's branded Chrome the extension is silently never loaded.
   * Chrome for Testing still supports it, and WebdriverIO downloads it (with a matching chromedriver) for this version.
   * @url https://groups.google.com/a/chromium.org/g/chromium-extensions/c/1-g8EFx2BBY/m/S0ET5wPjCAAJ
   */
  browserVersion: 'stable',
  acceptInsecureCerts: true,
  'goog:chromeOptions': {
    args: [
      '--disable-web-security',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      ...(IS_CI ? ['--headless'] : []),
    ],
    prefs: { 'extensions.ui.developer_mode': true },
    extensions: [bundledExtension],
  },
};

const firefoxCapabilities = {
  browserName: 'firefox',
  acceptInsecureCerts: true,
  'moz:firefoxOptions': {
    args: [...(IS_CI ? ['--headless'] : [])],
    /**
     * Firefox no longer lets WebDriver navigate to `about:debugging`, which was used to read the random internal UUID.
     * Pinning the UUID for the extension's gecko id makes `moz-extension://<uuid>` predictable.
     */
    prefs: {
      'extensions.webextensions.uuids': JSON.stringify({ [getGeckoId()]: FIREFOX_EXTENSION_UUID }),
    },
  },
};

export const config: WebdriverIO.Config = {
  ...baseConfig,
  capabilities: IS_FIREFOX ? [firefoxCapabilities] : [chromeCapabilities],

  maxInstances: IS_CI ? 10 : 1,
  logLevel: 'error',
  execArgv: IS_CI ? [] : ['--inspect'],
  before: async ({ browserName }: WebdriverIO.Capabilities, _specs, browser: WebdriverIO.Browser) => {
    if (browserName === 'firefox') {
      await browser.installAddOn(bundledExtension, true);

      browser.addCommand('getExtensionPath', async () => getFirefoxExtensionPath(browser));
    } else if (browserName === 'chrome') {
      browser.addCommand('getExtensionPath', async () => getChromeExtensionPath(browser));
    }
  },
  afterTest: async () => {
    if (!IS_CI) {
      await browser.pause(500);
    }
  },
};
