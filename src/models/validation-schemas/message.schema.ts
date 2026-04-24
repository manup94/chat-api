import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  receiverId: z.string().cuid("Invalid receiver ID"),
});

export type SendMessageData = z.infer<typeof sendMessageSchema>;
