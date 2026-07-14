export const onRequest = async (context: any, next: any) => {
  const response = await next();
  return response;
};
