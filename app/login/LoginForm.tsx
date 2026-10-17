'use client'

import { useState, useTransition } from "react";
import { login, setupAdmin } from "./actions";

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition";

export default function LoginForm({ mode }: { mode: "login" | "setup" }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "setup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const result = mode === "setup" ? await setupAdmin(name, password) : await login(name, password);
      if (result) setError(result.error);
    });
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white/90 rounded-3xl border border-white shadow-xl shadow-pink-200/60 p-8"
      >
        <div className="w-14 h-14 rounded-full bg-pink-200 flex items-center justify-center text-2xl mx-auto">
          👗
        </div>
        <h1 className="page-title text-center mt-4">
          {mode === "setup" ? "Create owner account" : "Welcome back"}
        </h1>
        <p className="text-sm text-stone-400 text-center mt-1 mb-6">
          {mode === "setup"
            ? "This account is the administrator and can add staff later."
            : "Log in to The Lady Dress"}
        </p>

        <div className="space-y-3">
          <input
            autoFocus
            autoComplete="username"
            className={inputCls}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
            className={inputCls}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "setup" && (
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !name.trim() || !password}
          className="mt-6 w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {isPending ? "Please wait…" : mode === "setup" ? "Create account" : "Log in"}
        </button>
      </form>
    </div>
  );
}
