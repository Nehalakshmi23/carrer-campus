/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@radix-ui/themes/styles.css';
declare module 'react-toastify/dist/ReactToastify.css';
