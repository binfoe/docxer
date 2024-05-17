export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(formater: any, ...args: any[]) {
    console.error(formater, ...args);
  },
  error(...args: unknown[]) {
    console.error(...args);
  },
};
