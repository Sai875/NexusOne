'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Session } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const session = await apiPost<Session>('/api/auth/login', { email, password });
      setSession(session);
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}!`);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold">NexusOne</div>
            <div className="text-xs text-muted-foreground">Enterprise Collaboration Platform</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your organization workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              New to NexusOne?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an organization
              </Link>
            </div>
            <div className="mt-4 rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-medium">Demo credentials</div>
              <div>Admin: alice.admin@nexuslabs.io / Admin@123</div>
              <div>Employee: carol.dev@nexuslabs.io / Carol@123</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
