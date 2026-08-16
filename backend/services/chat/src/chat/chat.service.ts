import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../common/auth-user';
import { CreateChannelDto, SendMessageDto, UpdateMessageDto } from './dto/chat.dto';
import { DomainEventsService } from './domain-events.service';
import { Channel, ChannelDocument, ChannelMember } from './schemas/channel.schema';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Channel.name) private readonly channelModel: Model<Channel>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly events: DomainEventsService,
  ) {}

  // ── Channels ─────────────────────────────────────────────────────────────

  async listChannels(orgId: string, userId: string): Promise<Channel[]> {
    const channels = await this.channelModel
      .find({ orgId })
      .sort({ type: 1, name: 1 })
      .lean();
    return channels.filter((channel) => this.canAccess(channel, orgId, userId));
  }

  async createChannel(dto: CreateChannelDto, user: AuthUser): Promise<Channel> {
    const slug = this.slugify(dto.name);
    const existing = await this.channelModel.findOne({ orgId: user.orgId, slug });
    if (existing) throw new ConflictException('A channel with this name already exists');

    const members: ChannelMember[] = dto.members
      ? dto.members.map((userId) => ({ userId, role: 'member' as const, joinedAt: new Date() }))
      : [];
    if (!members.some((member) => member.userId === user.sub)) {
      members.unshift({ userId: user.sub, role: 'owner', joinedAt: new Date() });
    }

    const channel = await this.channelModel.create({
      orgId: user.orgId,
      name: dto.name.trim(),
      slug,
      type: dto.type,
      description: dto.description ?? '',
      members,
      createdBy: user.sub,
    });
    this.logger.log(`Channel ${channel.slug} created by ${user.sub} (org ${user.orgId})`);
    return channel;
  }

  async ensureDefaultChannels(orgId: string, createdBy?: string): Promise<void> {
    const count = await this.channelModel.countDocuments({ orgId });
    if (count > 0) return;
    await this.channelModel.insertMany([
      {
        orgId,
        name: 'General',
        slug: 'general',
        type: 'public',
        description: 'Company-wide announcements and general discussion',
        members: [{ userId: createdBy ?? '', role: 'owner', joinedAt: new Date() }],
        createdBy: createdBy ?? null,
      },
      {
        orgId,
        name: 'Announcements',
        slug: 'announcements',
        type: 'announcement',
        description: 'Post-only channel for official announcements',
        members: [{ userId: createdBy ?? '', role: 'owner', joinedAt: new Date() }],
        createdBy: createdBy ?? null,
      },
    ]);
    this.logger.log(`Created default channels for org ${orgId}`);
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  async getMessages(
    orgId: string,
    channelId: string,
    userId: string,
    before?: string,
    limit = 50,
  ): Promise<Message[]> {
    const channel = await this.requireChannel(orgId, channelId, userId);
    if (!channel) return [];
    const query: Record<string, unknown> = { orgId, channelId };
    if (before) query.createdAt = { $lt: new Date(before) };
    return this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .lean();
  }

  async sendMessage(channelId: string, dto: SendMessageDto, user: AuthUser): Promise<Message> {
    const channel = await this.channelModel.findOne({
      _id: channelId,
      orgId: user.orgId,
      isArchived: false,
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!this.canAccess(channel, user.orgId, user.sub)) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    let threadId: string | null = null;
    if (dto.parentId) {
      const parent = await this.messageModel.findOne({
        _id: dto.parentId,
        channelId,
        orgId: user.orgId,
      });
      if (!parent) throw new NotFoundException('Parent message not found');
      threadId = dto.parentId;
    }

    const message = await this.messageModel.create({
      orgId: user.orgId,
      channelId,
      authorId: user.sub,
      text: dto.text,
      parentId: dto.parentId ?? null,
      threadId,
      mentions: dto.mentions ?? [],
      attachments: dto.attachments ?? [],
    });

    channel.lastMessageAt = new Date();
    await channel.save();

    for (const mentioneeId of dto.mentions ?? []) {
      if (mentioneeId !== user.sub) {
        void this.events.publish('chat.mentioned', user.orgId, {
          channelId,
          messageId: String(message._id),
          mentioneeId,
          mentionerId: user.sub,
          text: dto.text.slice(0, 140),
        });
      }
    }
    return message;
  }

  async updateMessage(messageId: string, dto: UpdateMessageDto, user: AuthUser): Promise<Message> {
    const message = await this.messageModel.findOne({ _id: messageId, orgId: user.orgId });
    if (!message) throw new NotFoundException('Message not found');
    if (message.authorId !== user.sub) throw new ForbiddenException('Only the author can edit');
    message.text = dto.text;
    message.editedAt = new Date();
    await message.save();
    return message;
  }

  async deleteMessage(messageId: string, user: AuthUser): Promise<void> {
    const message = await this.messageModel.findOne({ _id: messageId, orgId: user.orgId });
    if (!message) throw new NotFoundException('Message not found');
    const isAdmin = user.roles.includes('ORG_ADMIN') || user.roles.includes('MANAGER');
    if (message.authorId !== user.sub && !isAdmin) {
      throw new ForbiddenException('Only the author or an admin can delete');
    }
    message.deletedAt = new Date();
    message.text = '(message deleted)';
    await message.save();
  }

  async toggleReaction(messageId: string, emoji: string, user: AuthUser): Promise<Message> {
    const message = await this.messageModel.findOne({ _id: messageId, orgId: user.orgId });
    if (!message) throw new NotFoundException('Message not found');
    const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
    if (existing) {
      const idx = existing.userIds.indexOf(user.sub);
      if (idx >= 0) existing.userIds.splice(idx, 1);
      else existing.userIds.push(user.sub);
    } else {
      message.reactions.push({ emoji, userIds: [user.sub] });
    }
    await message.save();
    return message;
  }

  async getThread(orgId: string, messageId: string, userId: string): Promise<Message[]> {
    const parent = await this.messageModel.findOne({ _id: messageId, orgId });
    if (!parent) throw new NotFoundException('Message not found');
    const channel = await this.channelModel.findById(parent.channelId);
    if (!channel || !this.canAccess(channel, orgId, userId)) {
      throw new ForbiddenException('Access denied');
    }
    return this.messageModel.find({ threadId: messageId }).sort({ createdAt: 1 }).lean();
  }

  async search(orgId: string, q: string, limit = 25): Promise<Message[]> {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.messageModel
      .find({ orgId, deletedAt: null, text: { $regex: escaped, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean();
  }

  // ── Access control ───────────────────────────────────────────────────────

  canAccess(channel: Channel, orgId: string, userId: string): boolean {
    if (channel.orgId !== orgId) return false;
    if (channel.type === 'private' || channel.type === 'dm') {
      return channel.members.some((member) => member.userId === userId);
    }
    return true; // public + announcement channels are visible to all org members
  }

  private async requireChannel(
    orgId: string,
    channelId: string,
    userId: string,
  ): Promise<Channel | null> {
    const channel = await this.channelModel.findOne({ _id: channelId, orgId });
    if (!channel || !this.canAccess(channel, orgId, userId)) return null;
    return channel;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }
}

export type { ChannelDocument, MessageDocument };
