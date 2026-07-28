# Mahadum

Mahadum is a creator-first learning marketplace built with Next.js, TypeScript, and Tailwind CSS.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment and secrets

Copy `.env.example` to `.env.local` and add local values there. Environment files are ignored by Git. Never commit Supabase secret/service-role keys, Paystack secret keys, passwords, or private keys.

Only variables prefixed with `NEXT_PUBLIC_` are safe for browser code. Server credentials must remain unprefixed and must only be used in server-side modules.

## Checks

```bash
npm run lint
npm run build
```
