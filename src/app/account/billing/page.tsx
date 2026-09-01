import { redirect } from "next/navigation";

export default async function AccountBillingPage() {
  redirect("/account/orders");
}
