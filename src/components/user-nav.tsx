'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check user authentication state on mount
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    checkUser();

    // Listen for authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {user ? (
        // Authenticated user menu
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground hidden md:inline">
            Welcome, {user.user_metadata?.name || user.email?.split('@')[0]}
          </span>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      ) : (
        // Guest menu - only show Login button
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-foreground hover:text-primary transition-colors">
            Login
          </Link>
        </div>
      )}
    </>
  );
}
