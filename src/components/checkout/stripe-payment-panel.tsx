"use client";
import {useState,type FormEvent,type ComponentProps} from 'react';
import {CheckoutElementsProvider,PaymentElement,useCheckoutElements} from '@stripe/react-stripe-js/checkout';
import {trackCheckoutStep} from '@/lib/analytics-browser';
import {CheckoutError} from './checkout-fields';
export function StripePaymentPanel(props: Pick<ComponentProps<typeof CheckoutElementsProvider>, 'stripe' | 'options'>) {
  return <CheckoutElementsProvider {...props}><StripePaymentForm /></CheckoutElementsProvider>;
}
export function StripePaymentForm() {
  const result = useCheckoutElements();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (result.type !== "success" || !result.checkout.canConfirm) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      trackCheckoutStep("add_payment_info");
      const confirmResult = await result.checkout.confirm();

      if (confirmResult.type === "error") {
        trackCheckoutStep("payment_error");
        setErrorMessage(
          confirmResult.error.message ?? "Payment could not be completed.",
        );
      }
    } catch (error) {
      trackCheckoutStep("payment_error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result.type === "loading") {
    return (
      <div className="grid min-h-[360px] place-items-center text-sm font-medium text-muted">
        Loading secure payment...
      </div>
    );
  }

  if (result.type === "error") {
    return <CheckoutError message={result.error.message} />;
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div>
        <p className="tr-eyebrow">Payment</p>
        <h2 className="mt-1 text-xl font-medium text-ink">Pay securely</h2>
      </div>
      <PaymentElement
        options={{
          layout: {
            type: "accordion",
            radios: "always",
          },
          fields: {
            billingDetails: {
              name: "never",
              email: "never",
              phone: "never",
              address: "never",
            },
          },
        }}
      />
      {errorMessage ? (
        <p className="tr-status-warning" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!result.checkout.canConfirm || isSubmitting}
        className="tr-button-primary min-h-12 w-full"
      >
        {isSubmitting
          ? "Processing..."
          : `Pay ${result.checkout.total.total.amount}`}
      </button>
      <p className="text-center text-xs leading-5 text-muted">
        Payment is processed securely by Stripe.
      </p>
    </form>
  );
}
