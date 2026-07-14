export const onRequest = async (context: any, next: any) => {
  try {
    if (context.locals?.runtime?.env?.BLOG_KV) {
      (globalThis as any).__BLOG_KV__ = context.locals.runtime.env.BLOG_KV;
    }
  } catch {}
  return next();
};
