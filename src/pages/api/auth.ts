import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = formData.get('username')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const action = formData.get('action')?.toString();

  if (action === 'logout') {
    cookies.delete('auth', { path: '/' });
    return redirect('/admin');
  }

  if (username === 'funsh' && password === '510623') {
    cookies.set('auth', 'funsh', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
    return redirect('/admin');
  }

  return redirect('/admin?error=1');
};
