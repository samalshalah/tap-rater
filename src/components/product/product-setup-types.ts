export type UploadedLogo = {
  mediaUrl: string;
  storageKey: string;
  filename: string;
  originalMediaUrl?: string;
  originalStorageKey?: string;
  originalFilename?: string;
  trimApplied?: boolean;
  blankMarginPercent?: number;
};

export type LogoBackgroundMode = "auto_crop" | "original";
export type LogoFitMode = "contain" | "fill";

