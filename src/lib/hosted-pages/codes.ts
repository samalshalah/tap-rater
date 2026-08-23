const hostedPageCodeAlphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const hostedPageCodeLength = 12;
const hostedPageCodePattern = /^[A-HJKMNPQRSTVWXYZ2-9]{12}$/;

export function createHostedPageCode() {
  const bytes = new Uint8Array(hostedPageCodeLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => hostedPageCodeAlphabet[byte % hostedPageCodeAlphabet.length]).join("");
}

export function isValidHostedPageCode(value: string) {
  return hostedPageCodePattern.test(value);
}

export function assertHostedPageCode(value: string) {
  if (!isValidHostedPageCode(value)) {
    throw new HostedPageCodeError("Hosted page code must be a 12-character opaque Tap Rater code.");
  }
}

export class HostedPageCodeError extends Error {}

