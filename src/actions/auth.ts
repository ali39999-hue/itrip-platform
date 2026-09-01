'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginWithCredentials(email: string, pass: string) {
  try {
    await signIn('credentials', {
      email,
      password: pass,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid credentials' };
    }
    throw error;
  }
}

export async function logoutUser() {
  await signOut({ redirect: false });
}