export const replyStyles = { friendly: "Friendly", professional: "Professional", personal: "Warm & Personal", short: "Short & Simple" } as const;
export type ReplyStyle = keyof typeof replyStyles;
export type AutoReplySettings = { enabled: boolean; four: boolean; five: boolean; style: ReplyStyle; version: number };
export type ReplySuggestions = Record<ReplyStyle, string>;
export function eligibleForAutoReply(rating: number, reply: string, settings: AutoReplySettings) {
 return settings.enabled && !reply.trim() && ((rating === 4 && settings.four) || (rating === 5 && settings.five));
}
