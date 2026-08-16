import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationType =
  | 'task.assigned'
  | 'chat.mentioned'
  | 'event.reminder'
  | 'invite.accepted'
  | 'system';

export type NotificationDocument = HydratedDocument<AppNotification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class AppNotification {
  @Prop({ required: true, index: true })
  orgId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    enum: ['task.assigned', 'chat.mentioned', 'event.reminder', 'invite.accepted', 'system'],
    required: true,
  })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: null })
  link: string | null;

  @Prop({ type: Object, default: null })
  data: Record<string, unknown> | null;

  @Prop({ default: null })
  readAt: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(AppNotification);
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
