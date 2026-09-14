import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "../services/auth";

export function Login() {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await signUpWithPassword(
          email,
          password
        );
        if (signUpError) setError(signUpError.message);
        else if (!data.session)
          setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error: signInError } = await signInWithPassword(
          email,
          password
        );
        if (signInError) setError(signInError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f4] text-[#17201b]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-[#d7ddd5] bg-white p-8 shadow-[0_8px_24px_rgba(32,57,42,0.05)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-[#eff6df]">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#5a675f]">
              COI
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Compliance Agent
            </h1>
          </div>
        </div>
        <label className="mb-3 block text-sm font-medium text-[#365247]">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
        <label className="mb-5 block text-sm font-medium text-[#365247]">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="mb-4 text-sm text-[#a33e32]">{error}</p>}
        {notice && <p className="mb-4 text-sm text-[#3d7657]">{notice}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-[#173d32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" ? "sign-in" : "register");
            setError(null);
            setNotice(null);
          }}
          className="mt-3 w-full text-center text-xs font-medium text-[#5a675f] underline"
        >
          {mode === "register"
            ? "Already have an account? Sign in"
            : "Need an account? Register"}
        </button>
      </form>
    </main>
  );
}
