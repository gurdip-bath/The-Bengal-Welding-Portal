// Vite env types (avoids vite/client reference which can conflict with tsconfig types)
declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
export {}

// Declare image modules so TypeScript recognizes them
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}
