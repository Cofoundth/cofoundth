// Shared shape for a company-to-company chat message. Kept out of chat-actions
// because a "use server" module may only export async functions.
export type OrgMsg = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_org: string;
  sender_org_name: string;
  body: string;
  created_at: string;
};
