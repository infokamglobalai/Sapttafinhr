import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Switch } from 'antd';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';

const STORAGE_KEY = 'saptta_cookie_consent';

export type CookiePreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

function loadPrefs(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

function savePrefs(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('saptta-cookie-consent', { detail: prefs }));
}

export function getCookiePreferences(): CookiePreferences | null {
  return loadPrefs();
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!loadPrefs()) setVisible(true);
  }, []);

  const acceptAll = () => {
    savePrefs({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  };

  const rejectNonEssential = () => {
    savePrefs({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
  };

  const saveCustom = () => {
    savePrefs({
      necessary: true,
      functional,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
    setVisible(false);
    setShowSettings(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
      <div className="cookie-consent__panel">
        <button
          type="button"
          className="cookie-consent__close"
          aria-label="Close"
          onClick={rejectNonEssential}
        >
          <CloseOutlined />
        </button>

        {!showSettings ? (
          <>
            <p className="cookie-consent__title">We value your privacy</p>
            <p className="cookie-consent__text">
              Saptta uses cookies to run the website, remember preferences, and—only if you agree—understand how our
              marketing pages are used. See our{' '}
              <Link to="/privacy#cookies">Privacy Policy</Link> for details.
            </p>
            <div className="cookie-consent__actions">
              <Button type="primary" className="marketing-btn marketing-btn--primary" onClick={acceptAll}>
                Accept all
              </Button>
              <Button className="marketing-btn marketing-btn--ghost" onClick={rejectNonEssential}>
                Essential only
              </Button>
              <Button
                type="text"
                icon={<SettingOutlined />}
                className="cookie-consent__settings-btn"
                onClick={() => setShowSettings(true)}
              >
                Manage preferences
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="cookie-consent__title">Cookie preferences</p>
            <div className="cookie-consent__prefs">
              <div className="cookie-consent__pref-row">
                <div>
                  <strong>Strictly necessary</strong>
                  <span>Required for security, login, and consent storage</span>
                </div>
                <Switch checked disabled />
              </div>
              <div className="cookie-consent__pref-row">
                <div>
                  <strong>Functional</strong>
                  <span>Language and UI preferences</span>
                </div>
                <Switch checked={functional} onChange={setFunctional} />
              </div>
              <div className="cookie-consent__pref-row">
                <div>
                  <strong>Analytics</strong>
                  <span>Anonymous usage statistics</span>
                </div>
                <Switch checked={analytics} onChange={setAnalytics} />
              </div>
              <div className="cookie-consent__pref-row">
                <div>
                  <strong>Marketing</strong>
                  <span>Campaign and referral attribution</span>
                </div>
                <Switch checked={marketing} onChange={setMarketing} />
              </div>
            </div>
            <div className="cookie-consent__actions">
              <Button type="primary" className="marketing-btn marketing-btn--primary" onClick={saveCustom}>
                Save preferences
              </Button>
              <Button type="link" onClick={() => setShowSettings(false)}>
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Re-open preferences panel from footer */
export function openCookieSettings() {
  window.dispatchEvent(new Event('saptta-open-cookie-settings'));
}
