"use client";

import { useState, type FormEvent } from "react";
import { GoogleBusinessSearch, type GoogleBusinessSelection } from "@/components/activation/google-business-search";

type ActivationFormProps = {
  initialDeviceCode?: string;
};

type FormState = {
  deviceCode: string;
  activationCode: string;
  email: string;
  name: string;
  businessName: string;
  destinationType: string;
  destinationUrl: string;
  googlePlaceId: string;
  googlePlaceName: string;
  googleFormattedAddress: string;
};

const destinationOptions = [
  { value: "google_review_url", label: "Google review link" },
  { value: "direct_url", label: "Direct website or custom link" },
  { value: "facebook_url", label: "Facebook page or review link" },
  { value: "yelp_url", label: "Yelp profile link" },
  { value: "booking_url", label: "Appointment booking link" },
  { value: "social_url", label: "Social profile link" }
];

export function ActivationForm({ initialDeviceCode = "" }: ActivationFormProps) {
  const [form, setForm] = useState<FormState>({
    deviceCode: initialDeviceCode,
    activationCode: "",
    email: "",
    name: "",
    businessName: "",
    destinationType: "google_review_url",
    destinationUrl: "",
    googlePlaceId: "",
    googlePlaceName: "",
    googleFormattedAddress: ""
  });
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [redirectPath, setRedirectPath] = useState("");

  async function submitActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    setRedirectPath("");

    const response = await fetch("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Activation failed. Please check your details and try again.");
      return;
    }

    setStatus("success");
    setMessage("Your Tap Rater is active. Future taps will use your saved destination.");
    setRedirectPath(body.redirectPath ?? `/r/${encodeURIComponent(form.deviceCode.trim())}`);
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function useGoogleBusiness(place: GoogleBusinessSelection) {
    setForm((current) => ({
      ...current,
      businessName: current.businessName.trim() ? current.businessName : place.name,
      destinationUrl: place.reviewUrl,
      googlePlaceId: place.placeId,
      googlePlaceName: place.name,
      googleFormattedAddress: place.formattedAddress
    }));
  }

  return (
    <form onSubmit={submitActivation} className="grid gap-5 rounded-lg border border-line bg-white p-5 shadow-sm md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Device code
          <input
            required
            value={form.deviceCode}
            onChange={(event) => updateField("deviceCode", event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            placeholder="TR123"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Private activation code
          <input
            required
            value={form.activationCode}
            onChange={(event) => updateField("activationCode", event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            placeholder="Code from your insert card"
            autoComplete="one-time-code"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Your name
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            autoComplete="name"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            autoComplete="email"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-ink">
        Business name
        <input
          required
          value={form.businessName}
          onChange={(event) => updateField("businessName", event.target.value)}
          className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
          autoComplete="organization"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Destination type
          <select
            value={form.destinationType}
            onChange={(event) => {
              const destinationType = event.target.value;
              setForm((current) => ({
                ...current,
                destinationType,
                googlePlaceId: destinationType === "google_review_url" ? current.googlePlaceId : "",
                googlePlaceName: destinationType === "google_review_url" ? current.googlePlaceName : "",
                googleFormattedAddress: destinationType === "google_review_url" ? current.googleFormattedAddress : ""
              }));
            }}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
          >
            {destinationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Destination URL
          <input
            required
            type="url"
            value={form.destinationUrl}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                destinationUrl: event.target.value,
                googlePlaceId: "",
                googlePlaceName: "",
                googleFormattedAddress: ""
              }))
            }
            className="rounded-md border border-line px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            placeholder="https://"
            inputMode="url"
          />
        </label>
      </div>

      {form.destinationType === "google_review_url" ? (
        <GoogleBusinessSearch onConfirm={useGoogleBusiness} />
      ) : null}

      {form.googlePlaceId ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-bold">Google Business Profile selected</p>
          <p>{form.googlePlaceName}</p>
          {form.googleFormattedAddress ? <p>{form.googleFormattedAddress}</p> : null}
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm font-semibold ${
            status === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
          {redirectPath ? (
            <a href={redirectPath} className="mt-2 block text-brand underline">
              Test your Tap Rater redirect
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-muted"
      >
        {status === "saving" ? "Activating..." : "Activate Tap Rater"}
      </button>
    </form>
  );
}
