export const onRequest = async (context: any, next: any) => {
  try {
    const env = context.locals?.runtime?.env;
    if (env?.BLOG_KV) {
      (globalThis as any).__BLOG_KV__ = env.BLOG_KV;
    }
  } catch {}
  return next();
};
