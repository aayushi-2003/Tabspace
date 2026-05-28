import { useEffect, useState } from "react";
import { FiCheck, FiLock } from "react-icons/fi";
import { createTabspaceSupabaseClient } from "../lib/supabase";

const resetSupabase = createTabspaceSupabaseClient({
  detectSessionInUrl: true
});

function getRecoveryTokensFromUrl() {
  const searchParams = new URLSearchParams(globalThis.location.search);
  const hashParams = new URLSearchParams(
    globalThis.location.hash.replace(/^#/, "")
  );

  return {
    accessToken: hashParams.get("access_token"),
    code: searchParams.get("code"),
    refreshToken: hashParams.get("refresh_token"),
    type: hashParams.get("type") || searchParams.get("type")
  };
}

function ResetPassword() {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Preparing reset link...");
  const [wasUpdated, setWasUpdated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializeRecoverySession() {
      const { accessToken, code, refreshToken, type } =
        getRecoveryTokensFromUrl();

      try {
        if (code) {
          const { error } =
            await resetSupabase.auth.exchangeCodeForSession(code);

          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await resetSupabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) throw error;
        } else {
          const { data, error } =
            await resetSupabase.auth.getSession();

          if (error) throw error;

          if (!data.session) {
            throw new Error(
              "Open this page from the password reset email."
            );
          }
        }

        if (!isMounted) return;

        setIsReady(true);
        setStatus(
          type === "recovery" || !type
            ? "Enter a new password for your Tabspace account."
            : "Reset link opened."
        );
      } catch (error) {
        if (!isMounted) return;

        setStatus(error.message);
      }
    }

    initializeRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");

    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await resetSupabase.auth.updateUser({
        password
      });

      if (error) throw error;

      setWasUpdated(true);
      setStatus("Password updated. You can close this tab and sign in.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <main className="reset-page">
      <section className="reset-card">
        <div className="reset-brand">
          <div className="logo-box">T</div>
          <div>
            <h1>Tabspace</h1>
            <p>Password reset</p>
          </div>
        </div>

        {wasUpdated ? (
          <div className="success-state">
            <span className="success-icon">
              <FiCheck />
            </span>
            <h2>Password updated</h2>
            <p>{status}</p>
          </div>
        ) : (
          <form className="reset-form" onSubmit={handleSubmit}>
            <label className="input-row">
              <FiLock />
              <input
                autoComplete="new-password"
                disabled={!isReady || isUpdating}
                minLength={6}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="New password"
                type="password"
                value={password}
                required
              />
            </label>

            <label className="input-row">
              <FiLock />
              <input
                autoComplete="new-password"
                disabled={!isReady || isUpdating}
                minLength={6}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm password"
                type="password"
                value={confirmPassword}
                required
              />
            </label>

            <button
              className="primary-btn"
              disabled={!isReady || isUpdating}
              type="submit"
            >
              {isUpdating ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {status && !wasUpdated && (
          <p className="status-text">{status}</p>
        )}
      </section>
    </main>
  );
}

export default ResetPassword;
