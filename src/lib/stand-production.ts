import { isValidStandId, standTargetUrl } from "@/lib/hosted-pages/tracking";
import type { OrderLineItem } from "@/lib/order-types";

/** One physical stand to make: its permanent ID, the customer's name for it, and what goes on it. */
export type StandToMake = {
  standId: string;
  unitNumber: number;
  label: string;
  qrUrl: string | null;
  nfcUrl: string | null;
  /** True when this stand gets its own QR/NFC link (Multi-Link pages); false when every stand shares the same link. */
  ownLink: boolean;
};

type RegistryRow = Record<string, unknown>;

const readSetup = (item: OrderLineItem, key: string) => {
  const value = item.setup?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * The links one stand carries. For a Tap Rater page each stand gets the same page, tagged with its
 * Stand ID (and qr/nfc), so Insights can count every stand on its own. Other links are unchanged.
 */
export function standTargets(item: OrderLineItem, standId: string) {
  const hasQr = item.optionId !== "standard_direct";
  const qrBase = hasQr ? readSetup(item, "qrTargetUrl") ?? readSetup(item, "generatedQrValue") : null;
  const nfcBase = readSetup(item, "nfcTargetUrl") ?? readSetup(item, "destinationUrl") ?? readSetup(item, "hostedPageUrl");
  const id = isValidStandId(standId) ? standId : undefined;
  const qrUrl = qrBase ? standTargetUrl(qrBase, "qr", id) : null;
  const nfcUrl = nfcBase ? standTargetUrl(nfcBase, "nfc", id) : null;
  return { qrUrl, nfcUrl, ownLink: Boolean(id) && ((qrUrl !== null && qrUrl !== qrBase) || (nfcUrl !== null && nfcUrl !== nfcBase)) };
}

/** The stands of one order line, in unit order, with each stand's own links. */
export function standsToMake(item: OrderLineItem, registry: RegistryRow[]): StandToMake[] {
  return registry
    .filter((row) => row.line_id === item.standLineId && Number(row.unit_number) >= 1 && Number(row.unit_number) <= item.quantity)
    .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
    .map((row) => {
      const standId = String(row.public_id);
      return { standId, unitNumber: Number(row.unit_number), label: typeof row.draft_label === "string" ? row.draft_label : "", ...standTargets(item, standId) };
    });
}
