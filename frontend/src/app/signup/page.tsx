'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Session } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const session = await apiPost<Session>('/api/auth/register', form);
      setSession(session);
      toast.success(`Organization "${form.orgName || 'your new org'}" created`);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>You become the Organization Admin of a new tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={form.name} onChange={update('name')} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={form.email} onChange={update('email')} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={form.password} onChange={update('password')} placeholder="8+ chars, letters and digits" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name (optional)</Label>
              <Input id="orgName" value={form.orgName} onChange={update('orgName')} placeholder="Acme Inc." />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create workspace'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
