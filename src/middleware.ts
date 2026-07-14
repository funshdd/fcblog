export const onRequest = async (context: any, next: any) => {
  if (!(globalThis as any).__BLOG_KV__) {
    try {
      const env = context?.locals?.runtime?.env;
      if (env && env.BLOG_KV) {
        (globalThis as any).__BLOG_KV__ = env.BLOG_KV;
      }
    } catch (e) {}
  }
  const response = await next();
  return response;
};
