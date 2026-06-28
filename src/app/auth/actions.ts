"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export interface AuthActionState {
  message?: string;
  error?: string;
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export async function authenticate(
  mode: "sign-in" | "sign-up",
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return {
      error:
        "InsForge is not configured. Add the public project URL and anon key to use account auth.",
    };
  }

  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });

  const result =
    mode === "sign-up"
      ? await auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
          redirectTo: `${getAppUrl()}/auth`,
        })
      : await auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

  if (result.error) {
    return { error: result.error.message };
  }

  if (
    mode === "sign-up" &&
    result.data &&
    "requireEmailVerification" in result.data &&
    result.data.requireEmailVerification
  ) {
    return {
      message: "Check your email to verify your account, then sign in.",
    };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut() {
  if (
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    const auth = createAuthActions({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
      cookies: await cookies(),
    });
    await auth.signOut();
  }

  redirect("/");
}

function safeNextPath(nextPath?: string) {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/history";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
