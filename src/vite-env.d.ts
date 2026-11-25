/// <reference types="vite/client" />

/** Whether this build includes the rework lab (`/rework-lab`): dev server and Vercel previews only (see vite.config.ts). */
declare const __REWORK_LAB__: boolean;

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}
