/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/* global playSound */

/**
 * Config
 */

const FETCH_URL = 'https://m.facebook.com/';
const HOME_URL = 'https://www.facebook.com/';
const NOTIFICATIONS_URL = HOME_URL + 'notifications';
const RELEASES_URL = 'https://github.com/Narno/F-Notifier/releases';
const ISSUES_URL = 'https://github.com/Narno/F-Notifier/issues';

/**
 * Main functions
 */

// Notifications count function
const notificationsCount = callback => {
  const parser = new DOMParser();

  window.fetch(FETCH_URL, {
    cache: 'no-cache',
    credentials: 'include',
  })
    .then(response => {
      if (response.ok) {
        return response.text();
      }

      throw new Error('Network response was not OK');
    })
    .then(data => {
      let count = 0;
      const notificationsSelector = '#notifications_jewel';
      const requestsSelector = '#requests_jewel';
      const classSelector = '._59tg';
      const temporaryDom = parser.parseFromString(data, 'text/html');
      const countNotifElement = temporaryDom.querySelector(notificationsSelector).querySelector(classSelector);
      const countRequestElement = temporaryDom.querySelector(requestsSelector).querySelector(classSelector);

      // Debug
      console.log(temporaryDom);
      console.log(countNotifElement);
      console.log(countRequestElement);

      if (countNotifElement === null) {
        throw new Error('User not connected.');
      }

      count += Number.parseInt(countNotifElement.textContent, 10);

      if (localStorage.getItem('isFriendsReq') === 'true') {
        count += Number.parseInt(countRequestElement.textContent, 10);
      }

      callback(count);
    })
    .catch(callback);
};

// Update badge
function updateBadge() {
  notificationsCount(count => {
    if (count instanceof Error) {
      render(
        '?',
        [190, 190, 190, 255],
        chrome.i18n.getMessage('actionErrorTitle'),
      );

      return;
    }

    render(
      count > 0 ? count.toString() : '',
      [208, 0, 24, 255],
      count > 1 ? chrome.i18n.getMessage('actionNotifTitle', count.toString()) : chrome.i18n.getMessage('action01NotifTitle', count.toString()),
    );
    // Play sound?
    if (localStorage.getItem('isSound') === 'true'
      && (count > Number.parseInt(localStorage.getItem('count'), 10)
      || localStorage.getItem('count') === null)
    ) {
      playSound();
    }

    localStorage.setItem('count', count);
  });
}

// Badge renderer
function render(text, color, title) {
  chrome.browserAction.setBadgeText({text});
  chrome.browserAction.setBadgeBackgroundColor({color});
  chrome.browserAction.setTitle({title});
  chrome.browserAction.setIcon({path: 'icon-38.png'});
}

/**
 * Helpers
 */

function getTabUrl() {
  if (Number.parseInt(localStorage.getItem('count'), 10) > 0) {
    if (localStorage.getItem('landingPageIfNotif') === 'home') {
      return HOME_URL;
    }

    return NOTIFICATIONS_URL;
  }

  if (localStorage.getItem('landingPage') === 'notifications') {
    return NOTIFICATIONS_URL;
  }

  return HOME_URL;
}

function openFacebookHomeInTab(tab) {
  chrome.tabs.query({
    currentWindow: true,
    url: HOME_URL + '*',
  }, tabs => {
    if (tabs && tabs.length > 0) {
      return chrome.tabs.update(tabs[0].id, {active: true});
    }

    if (tab && tab.url === 'chrome://newtab/') {
      return chrome.tabs.update(null, {url: getTabUrl(), active: false});
    }

    return chrome.tabs.create({url: getTabUrl()});
  });
}

/**
 * Events
 */

// Chrome alarm
chrome.alarms.create({delayInMinutes: 1, periodInMinutes: 1});
chrome.alarms.onAlarm.addListener(updateBadge);

// Browser action
chrome.browserAction.onClicked.addListener(tab => {
  updateBadge();
  openFacebookHomeInTab(tab);
});

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(details => {
  // Set default options
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    localStorage.setItem('isFriendsReq', true);
    localStorage.setItem('isShowUpdates', true);
    chrome.runtime.openOptionsPage();
  }

  // Open releases details on update
  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE && localStorage.getItem('isShowUpdates') === 'true') {
    chrome.tabs.create({url: RELEASES_URL});
  }

  // Open issue on uninstall
  chrome.runtime.setUninstallURL((() => {
    switch (chrome.i18n.getUILanguage()) {
      case 'fr':
        return ISSUES_URL + '/new?labels=survey&title=Mon+avis+à+propos+de+cette+extension';
      case 'en':
      default:
        return ISSUES_URL + '/new?labels=survey&title=My+opinion+about+this+extension';
    }
  })());

  updateBadge();
});

// On message update badge
chrome.runtime.onMessage.addListener(updateBadge);

// Handle connection status events
function handleConnectionStatus(event) {
  if (event.type === 'online') {
    updateBadge();
  } else if (event.type === 'offline') {
    render(
      '?',
      [245, 159, 0, 255],
      chrome.i18n.getMessage('actionErrorTitle'),
    );
  }
}

window.addEventListener('online', handleConnectionStatus);
window.addEventListener('offline', handleConnectionStatus);
