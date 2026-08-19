import QRCode from "qrcode";

export const QR_CODE_ERROR_MESSAGE = "QR code could not be generated. Check the destination link.";

export const QR_CODE_OPTIONS = {
  color: {
    dark: "#000000",
    light: "#ffffff"
  },
  errorCorrectionLevel: "Q" as const,
  margin: 4,
  type: "svg" as const,
  width: 512
};

export async function createQrSvg(value: string) {
  const payload = value.trim();

  if (!payload) {
    throw new Error(QR_CODE_ERROR_MESSAGE);
  }

  try {
    const svg = await QRCode.toString(payload, QR_CODE_OPTIONS);

    if (!svg.includes("<svg") || !svg.includes("viewBox")) {
      throw new Error(QR_CODE_ERROR_MESSAGE);
    }

    return svg;
  } catch {
    throw new Error(QR_CODE_ERROR_MESSAGE);
  }
}
