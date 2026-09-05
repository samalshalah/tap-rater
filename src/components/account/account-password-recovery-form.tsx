"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PasswordField } from "@/components/account/password-field";

export function AccountPasswordRecoveryForm({ token }: { token?: string }) {
  const resetting = Boolean(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "error" || status === "success") messageRef.current?.focus();
  }, [status, message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    if (resetting && password !== confirmPassword) {
      setMessage("");
      confirmRef.current?.setCustomValidity("Passwords do not match.");
      confirmRef.current?.reportValidity();
      confirmRef.current?.focus();
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/account/password/${resetting ? "reset" : "forgot"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetting ? { token, password, confirmPassword } : { email })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to complete this request. Please try again.");
      setPassword("");
      setConfirmPassword("");
      setStatus("success");
      setMessage(resetting
        ? "Your password has been changed. Log in with your new password."
        : "If this email belongs to an active customer account, you will receive a reset link. Check your inbox and spam folder. The link expires in 20 minutes.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof TypeError ? "Unable to connect. Please try again." : error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className="tr-card grid min-w-0 gap-4 p-5 md:p-7" aria-busy={status === "loading"}>
      {status !== "success" ? <>
        {resetting ? <>
          <PasswordField label="New password" name="password" autoComplete="new-password" required minLength={8} maxLength={200}
            value={password} onChange={(event) => { setPassword(event.target.value); confirmRef.current?.setCustomValidity(""); }} disabled={status === "loading"} />
          <PasswordField label="Confirm password" name="confirmPassword" ref={confirmRef} autoComplete="new-password" required minLength={8} maxLength={200}
            value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); event.target.setCustomValidity(""); }} disabled={status === "loading"} />
        </> : <label className="tr-field-label min-w-0">
          Account email
          <input type="email" name="email" autoComplete="email" required maxLength={180} className="tr-input min-w-0"
            value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "loading"} />
        </label>}
        <button disabled={status === "loading"} className="tr-button-secondary disabled:bg-muted">
          {status === "loading" ? "Please wait..." : resetting ? "Reset password" : "Send reset link"}
        </button>
      </> : null}
      {message ? <div ref={messageRef} tabIndex={-1} role={status === "error" ? "alert" : "status"}
        className={status === "error" ? "tr-status-error" : "tr-status-success"}>{message}</div> : null}
      {resetting && status === "error" ? <Link href="/account/forgot-password" className="flex min-h-11 items-center text-sm text-teal underline underline-offset-4">Request a new reset link</Link> : null}
      <Link href="/account/login" className="flex min-h-11 w-fit items-center text-sm text-teal underline underline-offset-4">Back to log in</Link>
      {!resetting ? <Link href="/support" className="flex min-h-11 w-fit items-center text-sm text-muted underline underline-offset-4">Contact support</Link> : null}
    </form>
  );
}
