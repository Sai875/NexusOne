export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  roles: string[];
  type: 'access';
}
