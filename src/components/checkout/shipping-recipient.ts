export function resolveShippingRecipientName(
  shippingName: string,
  previousCustomerName: string,
  nextCustomerName: string
): string {
  // Keep the suggested recipient in sync, but preserve a different recipient.
  return !shippingName || shippingName === previousCustomerName ? nextCustomerName : shippingName;
}
