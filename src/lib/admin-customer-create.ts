import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db";
export const createCustomerSchema = z.object({
 email: z.string().trim().toLowerCase().email().max(254),
 name: z.string().trim().min(1).max(120),
 phone: z.string().trim().max(40).optional()
}).strict();
export async function createAdminCustomer(input: unknown, client = getSupabaseAdmin()) {
 const value = createCustomerSchema.parse(input);
 const existing = await client.from("customers").select("id").eq("email", value.email).maybeSingle();
 if (existing.error) return { ok: false as const, status: 503, error: "Customer storage is unavailable. Please try again." };
 if (existing.data) return { ok: false as const, status: 409, error: "A customer with this email already exists. Use the existing account." };
 const {data,error} = await client.from("customers").insert({
  email:value.email,name:value.name,phone:value.phone || null,role:"customer",account_status:"pending_activation"
 }).select("id,email,name").single();
 if(error || !data) return { ok: false as const, status: error?.code === "23505" ? 409 : 503,
  error: error?.code === "23505" ? "A customer with this email already exists." : "Customer could not be created. Please try again." };
 return { ok:true as const, customer:data };
}
