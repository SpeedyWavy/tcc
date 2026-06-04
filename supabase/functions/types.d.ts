/// <reference lib="dom" />

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (request: Request) => Promise<Response> | Response): void
}

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}
