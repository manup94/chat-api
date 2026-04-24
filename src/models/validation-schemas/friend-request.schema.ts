import { z } from 'zod';

export const friendRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const updateFriendRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});
