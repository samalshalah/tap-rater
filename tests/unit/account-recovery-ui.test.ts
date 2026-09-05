import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountLoginForm } from "@/components/account/account-login-form";
import { AccountActivationForm } from "@/components/account/account-activation-form";
import { AccountPasswordRecoveryForm } from "@/components/account/account-password-recovery-form";
import { PasswordField } from "@/components/account/password-field";

describe("account recovery UI", () => {
  it("starts passwords hidden with a labeled non-submit toggle", () => {
    const html = renderToStaticMarkup(createElement(PasswordField, { id: "new-password", label: "New password", autoComplete: "new-password" }));
    expect(html).toContain('type="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Show new password"');
    expect(html).toContain('for="new-password"');
    expect(html).toContain('autoComplete="new-password"');
  });
  it("makes password recovery reachable from sign-in", () => {
    const html = renderToStaticMarkup(createElement(AccountLoginForm));
    expect(html).toContain('href="/account/forgot-password"');
    expect(html).toContain('aria-label="Show password"');
  });
  it("supports visibility during activation", () => {
    expect(renderToStaticMarkup(createElement(AccountActivationForm, { token: "invalid-token" }))).toContain('aria-label="Show create password"');
  });
  it("offers an email request, support, and a return to sign-in", () => {
    const html = renderToStaticMarkup(createElement(AccountPasswordRecoveryForm));
    expect(html).toContain('type="email"');
    expect(html).toContain("Send reset link");
    expect(html).toContain('href="/account/login"');
    expect(html).toContain('href="/support"');
  });
  it("requires confirmation and does not repeat the email on the reset screen", () => {
    const html = renderToStaticMarkup(createElement(AccountPasswordRecoveryForm, { token: "a".repeat(43) }));
    expect(html.match(/type="password"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Show confirm password"');
    expect(html).not.toContain('type="email"');
    expect(html).toContain('minLength="8"');
    expect(html).toContain('maxLength="200"');
  });
});
