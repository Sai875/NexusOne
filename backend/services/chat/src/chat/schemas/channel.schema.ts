import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface ChannelMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export type ChannelDocument = HydratedDocument<Channel>;

@Schema({ timestamps: true, collection: 'channels' })
export class Channel {
  @Prop({ required: true, index: true })
  orgId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ enum: ['public', 'private', 'dm', 'announcement'], default: 'public' })
  type: 'public' | 'private' | 'dm' | 'announcement';

  @Prop({ default: '' })
  description: string;

  @Prop({ type: () => [Object], default: [] })
  members: ChannelMember[];

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: Date, default: null })
  lastMessageAt: Date | null;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
ChannelSchema.index({ orgId: 1, slug: 1 }, { unique: true });
ChannelSchema.index({ orgId: 1, type: 1 });
