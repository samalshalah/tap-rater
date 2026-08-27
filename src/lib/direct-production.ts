export type DirectProductionTargets = {
  destinationUrl: string;
  qrTargetUrl: string;
  nfcTargetUrl: string;
};

export type ProofApprovalSnapshot = {
  productSlug?: string;
  optionCode?: string;
  destinationUrl?: string;
  businessName?: string;
  logoStorageKey?: string;
  logoMediaUrl?: string;
  generatedQrValue?: string;
  frontTemplateUrl?: string;
  centerAssetUrl?: string;
  ctaText?: string;
};

export function normalizeDirectDestinationUrl(value: string | undefined | null) {
  return value?.trim() ?? "";
}

export function isHttpUrl(value: string | undefined | null) {
  const normalized = normalizeDirectDestinationUrl(value);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildDirectProductionTargets(destinationUrl: string | undefined | null): DirectProductionTargets | null {
  const normalized = normalizeDirectDestinationUrl(destinationUrl);
  if (!isHttpUrl(normalized)) {
    return null;
  }

  return {
    destinationUrl: normalized,
    qrTargetUrl: normalized,
    nfcTargetUrl: normalized
  };
}

export function buildProofApprovalSnapshot(input: ProofApprovalSnapshot): ProofApprovalSnapshot {
  return {
    productSlug: normalizeOptional(input.productSlug),
    optionCode: normalizeOptional(input.optionCode),
    destinationUrl: normalizeOptional(input.destinationUrl),
    businessName: normalizeOptional(input.businessName),
    logoStorageKey: normalizeOptional(input.logoStorageKey),
    logoMediaUrl: normalizeOptional(input.logoMediaUrl),
    generatedQrValue: normalizeOptional(input.generatedQrValue),
    frontTemplateUrl: normalizeOptional(input.frontTemplateUrl),
    centerAssetUrl: normalizeOptional(input.centerAssetUrl),
    ctaText: normalizeOptional(input.ctaText)
  };
}

export function isProofApprovalSnapshotCurrent(current: ProofApprovalSnapshot, approved: unknown) {
  if (!approved || typeof approved !== "object") {
    return false;
  }

  const normalizedApproved = buildProofApprovalSnapshot(approved as ProofApprovalSnapshot);
  const normalizedCurrent = buildProofApprovalSnapshot(current);
  return stableSnapshotString(normalizedApproved) === stableSnapshotString(normalizedCurrent);
}

function normalizeOptional(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function stableSnapshotString(snapshot: ProofApprovalSnapshot) {
  return JSON.stringify({
    productSlug: snapshot.productSlug ?? "",
    optionCode: snapshot.optionCode ?? "",
    destinationUrl: snapshot.destinationUrl ?? "",
    businessName: snapshot.businessName ?? "",
    logoStorageKey: snapshot.logoStorageKey ?? "",
    logoMediaUrl: snapshot.logoMediaUrl ?? "",
    generatedQrValue: snapshot.generatedQrValue ?? "",
    frontTemplateUrl: snapshot.frontTemplateUrl ?? "",
    centerAssetUrl: snapshot.centerAssetUrl ?? "",
    ctaText: snapshot.ctaText ?? ""
  });
}
