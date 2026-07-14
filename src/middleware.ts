export const onRequest = async (context, next) => {
  try {
    (globalThis as any).__BLOG_KV__ = context.locals?.runtime?.env?.BLOG_KV || context?.env?.BLOG_KV || null;
  } catch (e) {
    (globalThis as any).__BLOG_KV__ = (context as any)?.env?.BLOG_KV || null;
  }
  const response = await next();
  return response;
};
