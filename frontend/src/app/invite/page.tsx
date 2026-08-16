'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Session } from '@/lib/types';

function InviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const token = params.get('token') ?? '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const session = await apiPost<Session>('/api/auth/invite/accept', { token, name, password });
      setSession(session);
      toast.success('Welcome to the organization!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <CardDescription>Missing invitation token. Ask your admin to resend the invite link.</CardDescription>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Create a password</Label>
        <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Accepting…' : 'Accept invitation'}
      </Button>
    </form>
  );
}

export default function InvitePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>You&apos;re invited</CardTitle>
          <CardDescription>Join your team on NexusOne</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <InviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
