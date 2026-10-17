'use client'

import { useState, useTransition } from "react";
import type { Role } from "../../lib/auth";
import { addUser, changeRole, deleteUser, resetPassword } from "./actions";

type UserRow = { id: number; name: string; role: Role; createdAt: string };

const inputCls =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition";

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
        role === "ADMIN" ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700"
      }`}
    >
      {role === "ADMIN" ? "Administrator" : "Staff"}
    </span>
  );
}

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="flex gap-2">
      {(["STAFF", "ADMIN"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
            value === r
              ? r === "ADMIN"
                ? "border-pink-400 bg-pink-50 text-pink-700"
                : "border-sky-400 bg-sky-50 text-sky-700"
              : "border-stone-200 text-stone-400 hover:border-stone-300"
          }`}
        >
          {r === "ADMIN" ? "👑 Administrator" : "🛍️ Staff (checkout only)"}
        </button>
      ))}
    </div>
  );
}

function UserItem({ user, isMe }: { user: UserRow; isMe: boolean }) {
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string } | null>, okMsg?: string) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await action();
      if (result) setError(result.error);
      else if (okMsg) setDone(okMsg);
    });
  }

  return (
    <div className={`px-6 py-4 ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            user.role === "ADMIN" ? "bg-pink-200 text-pink-800" : "bg-sky-200 text-sky-800"
          }`}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">
            {user.name}
            {isMe && <span className="ml-2 text-xs text-stone-400">(you)</span>}
          </p>
          <div className="mt-0.5">
            <RoleBadge role={user.role} />
          </div>
        </div>

        <div className="flex gap-1 shrink-0 text-xs">
          <button
            onClick={() =>
              run(
                () => changeRole(user.id, user.role === "ADMIN" ? "STAFF" : "ADMIN"),
                user.role === "ADMIN" ? "Now staff." : "Now administrator."
              )
            }
            disabled={isMe}
            className="text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Make {user.role === "ADMIN" ? "staff" : "admin"}
          </button>
          <button
            onClick={() => setResetting((v) => !v)}
            className="text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md hover:bg-stone-100"
          >
            {isMe ? "Change password" : "Reset password"}
          </button>
          {!isMe && (
            <button
              onClick={() => {
                if (confirm(`Delete ${user.name}'s account?`)) run(() => deleteUser(user.id));
              }}
              className="text-stone-300 hover:text-red-500 text-xl leading-none px-1"
              aria-label={`Delete ${user.name}`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {resetting && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await resetPassword(user.id, password);
              if (!r) {
                setPassword("");
                setResetting(false);
              }
              return r;
            }, "Password changed.");
          }}
          className="flex gap-2 mt-3 ml-12"
        >
          <input
            type="password"
            autoFocus
            autoComplete="new-password"
            className={`${inputCls} flex-1`}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={!password}
            className="bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-xs font-semibold px-3 rounded-lg transition-colors"
          >
            Save
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600 mt-2 ml-12">{error}</p>}
      {done && <p className="text-xs text-emerald-600 mt-2 ml-12">{done}</p>}
    </div>
  );
}

function AddUserForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addUser(name, password, role);
      if (result) {
        setError(result.error);
        return;
      }
      setName("");
      setPassword("");
      setRole("STAFF");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 p-6"
    >
      <h2 className="text-sm font-semibold text-stone-700 mb-4">Add a user</h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Name (used to log in)"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="password"
          className={`${inputCls} flex-1`}
          placeholder="Password (4+ characters)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <RolePicker value={role} onChange={setRole} />
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !name.trim() || !password}
        className="mt-4 w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {isPending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}

export default function UsersClient({ meId, users }: { meId: number; users: UserRow[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/90 rounded-2xl border border-white shadow-sm shadow-fuchsia-100 overflow-hidden divide-y divide-stone-100">
        {users.map((u) => (
          <UserItem key={u.id} user={u} isMe={u.id === meId} />
        ))}
      </div>
      <AddUserForm />
    </div>
  );
}
