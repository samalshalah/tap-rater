"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type" | "className"> & { label: string };

export function PasswordField({ label, id, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const toggleLabel = `${visible ? "Hide" : "Show"} ${label.toLowerCase()}`;

  return (
    <div className="grid min-w-0 gap-2">
      <label className="tr-field-label" htmlFor={inputId}>{label}</label>
      <div className="relative min-w-0">
        <input {...props} id={inputId} type={visible ? "text" : "password"} className="tr-input !mt-0 min-w-0 !pr-14" />
        <button type="button" onClick={() => setVisible((value) => !value)} disabled={props.disabled}
          aria-label={toggleLabel} title={toggleLabel} aria-controls={inputId}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
          <Icon size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
