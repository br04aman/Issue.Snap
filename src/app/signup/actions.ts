'use server';

import { createClient } from '@/lib/supabase/server';

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return {
      error: {
        message: 'Name, email, and password are required.',
      },
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'user', // Add a role to distinguish users from employees
      },
    },
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {};
}
