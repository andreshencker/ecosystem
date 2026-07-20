import { z } from 'zod';

export const channelProviderFormSchema = z.object({
  channelId:  z.string().min(1, 'Channel is required.'),
  providerId: z.string().min(1, 'Provider is required.'),
  isDefault:  z.boolean(),
  isActive:   z.boolean(),
});

export type ChannelProviderFormValues = z.infer<typeof channelProviderFormSchema>;
