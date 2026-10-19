import { handleSampleReply } from "@/lib/review-workspace-http";
export async function POST(request: Request) { return handleSampleReply(request, "admin"); }
