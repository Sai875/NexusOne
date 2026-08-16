import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, index: true })
  orgId: string;

  @Prop({ required: true, index: true })
  channelId: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  text: string;

  /** Set when this message is a reply inside a thread. */
  @Prop({ type: String, index: true, default: null })
  threadId: string | null;

  /** Set when this message starts a thread (its own id, for reverse lookup). */
  @Prop({ type: String, default: null })
  parentId: string | null;

  @Prop({ type: () => [String], default: [] })
  mentions: string[];

  @Prop({
    type: () => [
      { name: String, url: String, size: Number, mimeType: String },
    ],
    default: [],
  })
  attachments: Attachment[];

  @Prop({
    type: () => [{ emoji: String, userIds: [String] }],
    default: [],
  })
  reactions: Reaction[];

  @Prop({ type: Date, default: null })
  editedAt: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ orgId: 1, createdAt: -1 });
