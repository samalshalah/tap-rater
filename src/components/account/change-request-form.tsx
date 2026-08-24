"use client";

import { useState, type FormEvent } from "react";

export function ChangeRequestForm({ deviceCode }: { deviceCode?: string }) {
  const [tapraterId, setTapraterId] = useState(deviceCode ?? "");
  const [newReviewUrl, setNewReviewUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/account/change-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tapraterId, newReviewUrl, notes })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Change request could not be saved.");
      return;
    }

    setStatus("success");
    setMessage("Change request saved. Tap Rater support will review it.");
    setNewReviewUrl("");
    setNotes("");
  }

  return (
    <form onSubmit={submitRequest} className="tr-card grid gap-3 p-4">
      <p className="font-black text-ink">Request destination change</p>
      <input
        required
        value={tapraterId}
        onChange={(event) => setTapraterId(event.target.value)}
        placeholder="Tap Rater ID"
        className="tr-input"
      />
      <input
        required
        type="url"
        value={newReviewUrl}
        onChange={(event) => setNewReviewUrl(event.target.value)}
        placeholder="https://new-destination.example"
        className="tr-input"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes for support"
        className="tr-textarea min-h-24"
      />
      <button disabled={status === "saving"} className="tr-button-secondary w-fit">
        {status === "saving" ? "Sending..." : "Send request"}
      </button>
      {message ? (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
