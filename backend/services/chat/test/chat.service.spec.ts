import { ChatService } from '../src/chat/chat.service';
import { Channel, ChannelMember } from '../src/chat/schemas/channel.schema';

const user = {
  sub: '44444444-4444-4444-8444-444444444444',
  email: 'c@x.io',
  name: 'Carol',
  orgId: 'org-1',
  orgName: 'Org',
  orgSlug: 'org',
  roles: ['EMPLOYEE'],
  type: 'access' as const,
};

function channel(partial: Partial<Channel>): Channel {
  return {
    orgId: 'org-1',
    name: 'Test',
    slug: 'test',
    type: 'public',
    description: '',
    members: [],
    createdBy: null,
    lastMessageAt: null,
    isArchived: false,
    ...partial,
  };
}

describe('ChatService.canAccess', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService(null as never, null as never, null as never);
  });

  it('allows org members into public channels', () => {
    expect(service.canAccess(channel({ type: 'public' }), 'org-1', user.sub)).toBe(true);
  });

  it('blocks members of other organizations', () => {
    expect(service.canAccess(channel({ orgId: 'org-2' }), 'org-1', user.sub)).toBe(false);
  });

  it('requires membership for private channels', () => {
    const privateChannel = channel({
      type: 'private',
      members: [{ userId: 'someone-else', role: 'member', joinedAt: new Date() }],
    });
    expect(service.canAccess(privateChannel, 'org-1', user.sub)).toBe(false);

    const joined: ChannelMember[] = [{ userId: user.sub, role: 'member', joinedAt: new Date() }];
    expect(service.canAccess(channel({ type: 'private', members: joined }), 'org-1', user.sub)).toBe(true);
  });
});

describe('ChatService.createChannel', () => {
  it('normalizes channel names to slugs', async () => {
    const created: Record<string, unknown>[] = [];
    const channelModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(data);
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
    };
    const service = new ChatService(channelModel as never, null as never, null as never);

    const result = await service.createChannel({ name: '  Platform & Infra!  ', type: 'public' }, user);

    expect(created[0].slug).toBe('platform-infra');
    expect(result.slug).toBe('platform-infra');
  });
});
