let _kv: any = null;

export const onRequest = async (context: any, next: any) => {
  if (!_kv) {
    _kv =
      context?.locals?.runtime?.env?.BLOG_KV ||
      context?.env?.BLOG_KV ||
      context?.platform?.env?.BLOG_KV ||
      context?.cf?.env?.BLOG_KV ||
      null;
    (globalThis as any).__BLOG_KV__ = _kv;
  }
  return next();
};
