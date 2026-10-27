export type CustomerForm = {
  email: string;
  name: string;
  phone: string;
  createAccount: boolean;
};

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

