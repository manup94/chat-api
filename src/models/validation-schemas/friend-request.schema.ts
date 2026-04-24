import { z } from 'zod';

export const friendRequestSchema = z.object({
  email: z.string().email("Invalid email address").max(254, "Email too long"),
});

export const updateFriendRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});
