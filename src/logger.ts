export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(formater: any, ...args: any[]) {
    console.debug(formater, ...args);
  },
  error(...args: unknown[]) {
    console.error(...args);
  },
};
