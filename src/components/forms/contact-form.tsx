"use client";

import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/forms/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message")
      })
    });
    const body = await response.json();
    setStatus(response.ok ? "Message sent." : body.error ?? "Message failed.");
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <input className="tr-input" name="name" placeholder="Name" required />
      <input className="tr-input" name="email" type="email" placeholder="Email" required />
      <textarea className="tr-textarea" name="message" placeholder="Message" required />
      <button className="tr-button-secondary">Send message</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </form>
  );
}
