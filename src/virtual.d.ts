declare module 'virtual:print-assets/routes' {
  import type { PrintRoute } from './types.js';
  const routes: PrintRoute[];
  export default routes;
}

declare module 'virtual:print-assets/config' {
  export const themeClass: string | undefined;
}
