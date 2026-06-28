"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  authenticate,
  type AuthActionState,
} from "./actions";

const initialState: AuthActionState = {};

export function AuthForm({
  configured,
  nextPath,
}: {
  configured: boolean;
  nextPath: string;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const action = authenticate.bind(null, mode);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-black/5 p-1">
        {(["sign-in", "sign-up"] as const).map((option) => (
          <button
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              mode === option
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            key={option}
            onClick={() => setMode(option)}
            type="button"
          >
            {option === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input name="next" type="hidden" value={nextPath} />
        {mode === "sign-up" && (
          <Field
            autoComplete="name"
            label="Name"
            name="name"
            placeholder="Your name"
          />
        )}
        <Field
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <Field
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          label="Password"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
        {state.error && (
          <p
            aria-live="polite"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}
        {state.message && (
          <p
            aria-live="polite"
            className="rounded-lg bg-[#efffb6] px-3 py-2 text-sm text-[#3f4d0b]"
          >
            {state.message}
          </p>
        )}
        <Button
          className="h-11 w-full bg-[#101513] text-white"
          disabled={pending || !configured}
          type="submit"
        >
          {pending && <LoaderCircle className="animate-spin" />}
          {mode === "sign-in" ? "Sign in to Ghost" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
function Field({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-white px-3 outline-none transition placeholder:text-black/30 focus:border-[#91ae16] focus:ring-3 focus:ring-[#d9ff43]/25"
        {...props}
      />
    </label>
  );
}
