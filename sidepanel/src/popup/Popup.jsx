import { useEffect, useState } from "react";
import {
  FiArrowRight,
  FiLogOut,
  FiMail,
  FiLock,
  FiRefreshCw
} from "react-icons/fi";
import {
  getCurrentSession,
  onAuthStateChange,
  sendPasswordResetEmail,
  signInWithEmail,
  signOut,
  signUpWithEmail
} from "../lib/auth";
import {
  syncBothWays
} from "../lib/sync";

const LAST_SYNC_KEY = "tabspace:last-sync-at";

const hasChromeStorage = () =>
  typeof globalThis.chrome !== "undefined" &&
  Boolean(globalThis.chrome.storage?.local);

async function getLastSyncAt() {
  if (hasChromeStorage()) {
    const result = await globalThis.chrome.storage.local.get([LAST_SYNC_KEY]);

    return result[LAST_SYNC_KEY] || "";
  }

  return localStorage.getItem(LAST_SYNC_KEY) || "";
}

async function setLastSyncAt(value) {
  if (hasChromeStorage()) {
    await globalThis.chrome.storage.local.set({
      [LAST_SYNC_KEY]: value
    });

    return;
  }

  localStorage.setItem(LAST_SYNC_KEY, value);
}

function formatLastSyncAt(value) {
  if (!value) {
    return "Never synced";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getPasswordResetRedirectUrl() {
  if (globalThis.chrome?.runtime?.getURL) {
    return globalThis.chrome.runtime.getURL(
      "sidepanel/dist/reset-password.html"
    );
  }

  return `${globalThis.location.origin}/reset-password.html`;
}

function Popup() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAtState] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
      })
      .catch((error) => {
        if (!isMounted) return;

        setStatus(error.message);
      })
      .finally(() => {
        if (!isMounted) return;

        setIsLoading(false);
      });

    getLastSyncAt().then((value) => {
      if (!isMounted) return;

      setLastSyncAtState(value);
    });

    const subscription = onAuthStateChange((currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openSidepanel = () => {
    if (!globalThis.chrome?.sidePanel) {
      setStatus("Sidepanel is available inside the extension.");
      return;
    }

    globalThis.chrome.sidePanel.open({
      windowId: globalThis.chrome.windows.WINDOW_ID_CURRENT
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    setIsLoading(true);

    try {
      if (authMode === "reset") {
        await sendPasswordResetEmail(
          email,
          getPasswordResetRedirectUrl()
        );
        setStatus("Password reset email sent.");
        return;
      }

      const nextSession =
        authMode === "sign-in"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);

      setSession(nextSession);

      if (nextSession) {
        setStatus("Signed in.");
      } else {
        setStatus("Check your email to confirm your account.");
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setStatus("");
    setIsLoading(true);

    try {
      await signOut();
      setSession(null);
      setStatus("Signed out.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const notifySidepanelRefresh = () => {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      return;
    }

    globalThis.chrome.runtime.sendMessage({
      type: "tabspace:storage-updated"
    });
  };

  const handleSyncNow = async () => {
    if (!session) return;

    setStatus("");
    setIsSyncing(true);

    try {
      const result = await syncBothWays(session);
      const syncedAt = new Date().toISOString();

      await setLastSyncAt(syncedAt);
      setLastSyncAtState(syncedAt);
      notifySidepanelRefresh();

      setStatus(
        `Synced ${result.uploaded} up, restored ${result.restored} down${
          result.conflicts
            ? `, resolved ${result.conflicts} conflict${
                result.conflicts === 1 ? "" : "s"
              }`
            : ""
        }.`
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="popup-shell">
      <section className="popup-brand">
        <div className="logo-box">B</div>

        <div>
          <h1>Tabspace</h1>
          <p>Quick workspace access</p>
        </div>
      </section>

      {session ? (
        <section className="account-card">
          <div>
            <span className="eyebrow">Signed in</span>
            <p className="account-email">
              {session.user.email}
            </p>
            <p className="sync-meta">
              Last sync: {formatLastSyncAt(lastSyncAt)}
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openSidepanel}
            type="button"
          >
            Open Sidepanel
            <FiArrowRight />
          </button>

          <button
            className="sync-btn"
            onClick={handleSyncNow}
            type="button"
            disabled={isSyncing || isLoading}
          >
            <FiRefreshCw />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>

          <button
            className="ghost-btn"
            onClick={handleSignOut}
            type="button"
            disabled={isLoading}
          >
            <FiLogOut />
            Sign out
          </button>
        </section>
      ) : (
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs">
            <button
              className={authMode === "sign-in" ? "active-tab" : ""}
              onClick={() => setAuthMode("sign-in")}
              type="button"
            >
              Sign in
            </button>

            <button
              className={authMode === "sign-up" ? "active-tab" : ""}
              onClick={() => setAuthMode("sign-up")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <label className="input-row">
            <FiMail />
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              type="email"
              value={email}
              required
            />
          </label>

          {authMode !== "reset" && (
            <label className="input-row">
              <FiLock />
              <input
                autoComplete={
                  authMode === "sign-in"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                value={password}
                required
              />
            </label>
          )}

          <button
            className="primary-btn"
            disabled={isLoading}
            type="submit"
          >
            {isLoading
              ? "Please wait..."
              : authMode === "reset"
                ? "Send reset email"
                : authMode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>

          <button
            className="text-btn"
            onClick={() => {
              setStatus("");
              setAuthMode(
                authMode === "reset" ? "sign-in" : "reset"
              );
            }}
            type="button"
          >
            {authMode === "reset"
              ? "Back to sign in"
              : "Forgot password?"}
          </button>
        </form>
      )}

      {status && <p className="status-text">{status}</p>}
    </main>
  );
}

export default Popup;
