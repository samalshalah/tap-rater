"use client";

import { type FormEvent, useState } from "react";

export function ChangeLinkForm() {
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/forms/change-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        tapraterId: form.get("tapraterId"),
        newReviewUrl: form.get("newReviewUrl"),
        notes: form.get("notes") ?? ""
      })
    });
    const body = await response.json();
    setStatus(response.ok ? "Change request sent." : body.error ?? "Change request failed.");
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <input className="tr-input" name="name" placeholder="Name" required />
      <input className="tr-input" name="email" type="email" placeholder="Email" required />
      <input className="tr-input" name="tapraterId" placeholder="TapRater ID or product SKU" required />
      <input className="tr-input" name="newReviewUrl" type="url" placeholder="New review or feedback URL" required />
      <textarea className="tr-textarea min-h-28" name="notes" placeholder="Notes" />
      <button className="tr-button-secondary">Send change request</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </form>
  );
}
