/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-syntax-highlighter' {
  // minimal typings to satisfy TS
  export const Prism: any;
  export const PrismLight: any;
  const _default: any;
  export default _default;
}
declare module 'react-syntax-highlighter/dist/esm/languages/prism/*' {
  const lang: any;
  export default lang;
}
declare module 'react-syntax-highlighter/dist/esm/styles/prism/*' {
  const style: any;
  export default style;
}