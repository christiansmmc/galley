export {};
declare global {
  interface Window {
    __setTheme: (t: string) => void;
    __setLang: (l: string) => void;
    __STRINGS: Record<'en' | 'pt', Record<string, string>>;
  }
}
