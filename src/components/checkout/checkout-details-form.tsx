"use client";
import type {Dispatch,SetStateAction,FormEvent} from 'react';
import type {getCartRows} from '@/lib/cart';
import {AddressAutocomplete} from './address-autocomplete';
import {resolveShippingRecipientName} from './shipping-recipient';
import {CheckoutInput,CheckoutStateSelect,revealFirstInvalidControl} from './checkout-fields';
import type {CustomerForm,ShippingForm} from './checkout-details-types';
type Props={
 startPayment:(event:FormEvent<HTMLFormElement>)=>Promise<void>;
 hasHostedMultiLink:boolean;
 customer:CustomerForm;
 setCustomer:Dispatch<SetStateAction<CustomerForm>>;
 shipping:ShippingForm;
 setShipping:Dispatch<SetStateAction<ShippingForm>>;
 differentRecipient:boolean;
 setDifferentRecipient:Dispatch<SetStateAction<boolean>>;
 setIsFillingAddress:Dispatch<SetStateAction<boolean>>;
 error:string;
 reminderConsent:boolean;
 setReminderConsent:Dispatch<SetStateAction<boolean>>;
 isStartingPayment:boolean;
 isFillingAddress:boolean;
 rows:ReturnType<typeof getCartRows>;
};
export function CheckoutDetailsForm({startPayment, hasHostedMultiLink, customer, setCustomer, shipping, setShipping, differentRecipient, setDifferentRecipient, setIsFillingAddress, error, reminderConsent, setReminderConsent, isStartingPayment, isFillingAddress, rows}:Props){
 return (<form className="grid gap-4" onSubmit={startPayment}>
              <div>
                <p className="tr-eyebrow">Customer</p>
                <h2 className="mt-1 text-xl font-medium text-ink">
                  Contact and shipping
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {hasHostedMultiLink ? "Payment comes next. Your Multi-Link account is included." : "Guest checkout. No account or subscription needed."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <CheckoutInput
                  label="Email"
                  type="email"
                  value={customer.email}
                  autoComplete="email"
                  onChange={(value) =>
                    setCustomer((current) => ({ ...current, email: value }))
                  }
                  required
                />
                <CheckoutInput
                  label="Full name"
                  value={customer.name}
                  autoComplete="name"
                  onChange={(value) => {
                    setCustomer((current) => ({ ...current, name: value }));
                    setShipping((current) => ({
                      ...current,
                      name: resolveShippingRecipientName(
                        current.name,
                        customer.name,
                        value,
                      ),
                    }));
                  }}
                  required
                />
                <CheckoutInput
                  label="Phone (optional)"
                  type="tel"
                  value={customer.phone}
                  autoComplete="tel"
                  onChange={(value) =>
                    setCustomer((current) => ({ ...current, phone: value }))
                  }
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={differentRecipient || Boolean(shipping.name && shipping.name !== customer.name)} onChange={(event) => {
                    setDifferentRecipient(event.target.checked);
                    if (!event.target.checked) setShipping(current => ({ ...current, name: customer.name }));
                  }} /> Ship to someone else
                </label>
                {differentRecipient || Boolean(shipping.name && shipping.name !== customer.name) ? <CheckoutInput
                  label="Recipient name"
                  value={shipping.name}
                  autoComplete="shipping name"
                  onChange={(value) =>
                    setShipping((current) => ({ ...current, name: value }))
                  }
                  required
                /> : null}
              </div>

              <div className="grid gap-3">
                <AddressAutocomplete
                  value={shipping.line1}
                  onChange={(value) =>
                    setShipping((current) => ({ ...current, line1: value }))
                  }
                  onSelect={(address) =>
                    setShipping((current) => ({
                      ...current,
                      ...address,
                      line2: address.line2 || current.line2,
                    }))
                  }
                  onBusyChange={setIsFillingAddress}
                  onInvalid={revealFirstInvalidControl}
                />
                <CheckoutInput
                  label="Apartment, suite, unit (optional)"
                  value={shipping.line2}
                  autoComplete="shipping address-line2"
                  onChange={(value) =>
                    setShipping((current) => ({ ...current, line2: value }))
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_180px_128px]">
                  <CheckoutInput
                    label="City"
                    value={shipping.city}
                    autoComplete="shipping address-level2"
                    onChange={(value) =>
                      setShipping((current) => ({ ...current, city: value }))
                    }
                    required
                  />
                  <CheckoutStateSelect
                    value={shipping.state}
                    onChange={(value) =>
                      setShipping((current) => ({ ...current, state: value }))
                    }
                  />
                  <CheckoutInput
                    label="ZIP code"
                    value={shipping.postalCode}
                    autoComplete="shipping postal-code"
                    onChange={(value) =>
                      setShipping((current) => ({
                        ...current,
                        postalCode: value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-md border border-line bg-soft p-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={hasHostedMultiLink || customer.createAccount}
                  disabled={hasHostedMultiLink}
                  onChange={(event) =>
                    setCustomer((current) => ({
                      ...current,
                      createAccount: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <span>
                  <span className="block font-medium">
                    {hasHostedMultiLink
                      ? "Account included for Multi-Link"
                      : "Create an account for order access"}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {hasHostedMultiLink
                      ? "After payment, sign in to manage your Multi-Link page. New customers receive an activation email; existing customers keep their password."
                      : "Optional. The customer can track orders and access billing after payment."}
                  </span>
                </span>
              </label>

              {error ? (
                <p className="tr-status-warning" role="alert">
                  {error}
                </p>
              ) : null}

              <label className="flex items-start gap-3 text-sm text-muted"><input type="checkbox" checked={reminderConsent} onChange={event => setReminderConsent(event.target.checked)} className="mt-1" />Email me reminders if I leave this order unfinished. Optional; unsubscribe anytime.</label>
              <button
                type="submit"
                disabled={
                  isStartingPayment || isFillingAddress || rows.length === 0
                }
                className="tr-button-primary min-h-12 w-full"
              >
                {isStartingPayment
                  ? "Preparing payment..."
                  : "Continue to payment"}
              </button>
            </form>);
}
