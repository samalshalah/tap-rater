export type CustomerForm = {
  email: string;
  /** First and last name as typed; `name` is both joined, which the order and Stripe use. */
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  createAccount: boolean;
};

export function joinCustomerName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Splits a saved full name for the two boxes: first word, then the rest. */
export function splitCustomerName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export type ShippingForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US";
  phone: string;
};

