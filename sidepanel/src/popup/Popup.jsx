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
  signInWithEmail,
  signOut,
  signUpWithEmail
} from "../lib/auth";
import { syncLocalWorkspacesToSupabase } from "../lib/sync";

function Popup() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleSyncNow = async () => {
    if (!session) return;

    setStatus("");
    setIsSyncing(true);

    try {
      const result = await syncLocalWorkspacesToSupabase(session);

      setStatus(
        result.count === 0
          ? "No local workspaces to sync yet."
          : `Synced ${result.count} local workspace${
              result.count === 1 ? "" : "s"
            } to Supabase.`
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
          <h1>Bookmark Notes</h1>
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
            {isSyncing ? "Syncing..." : "Sync now"}
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

          <button
            className="primary-btn"
            disabled={isLoading}
            type="submit"
          >
            {isLoading
              ? "Please wait..."
              : authMode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      )}

      {status && <p className="status-text">{status}</p>}
    </main>
  );
}

export default Popup;
