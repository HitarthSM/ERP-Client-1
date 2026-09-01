import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { clerk } from '../../lib/clerk';
import { AuthService } from '../../services/auth.service';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateOrganization() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (user.organization) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let clerkOrg: Awaited<ReturnType<typeof clerk.createOrganization>> | undefined;
    try {
      clerkOrg = await clerk.createOrganization({ name: name.trim() });
      await clerk.setActive({ organization: clerkOrg.id });
      await AuthService.createOrganization({
        name: name.trim(),
        slug: slug.trim(),
        clerkOrgId: clerkOrg.id,
      });
      await refresh();
      toast.success('Organization created');
      navigate('/');
    } catch (error: any) {
      // Backend failed after the Clerk org was created — clean it up so retry doesn't orphan/duplicate it.
      if (clerkOrg) await clerkOrg.destroy().catch(() => {});
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Create Your Organization</h1>
          <p className="text-muted-foreground">One more step before you get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const nextName = e.target.value;
                setName(nextName);
                setSlug((current) => (current === slugify(name) || !current ? slugify(nextName) : current));
              }}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(slugify(e.target.value))}
              placeholder="acme-inc"
              required
            />
            <p className="text-xs text-muted-foreground">Used in links and invites. Lowercase letters, numbers, and dashes only.</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      </div>
    </div>
  );
}
