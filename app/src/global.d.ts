interface Window {
  __rheoServerStartedByApp?: boolean;
}

declare module 'virtual:changelog' {
  const raw: string;
  export default raw;
}

declare module '*.wav' {
  const src: string;
  export default src;
}
