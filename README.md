This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## REPRA Auth Setup

### Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `NEXT_PUBLIC_SITE_URL` | Production base URL (e.g. `https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app`) |

`NEXT_PUBLIC_SITE_URL` is used as the `redirectTo` base for password reset emails.
In local dev it can be omitted — the request `host` header is used as a fallback.

Set `NEXT_PUBLIC_SITE_URL` in **Vercel → Project → Settings → Environment Variables**.

### Supabase Dashboard settings

**Authentication → URL Configuration**

| Setting | Value |
|---|---|
| Site URL | `https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app` |

Redirect URLs (add all):
```
https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app/**
https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app/reset-password
https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app/reset-password/**
http://localhost:3000/**
http://localhost:3000/reset-password
http://localhost:3000/reset-password/**
```
Add custom domain entries once a custom domain is configured.

### SMTP (required for production)

Supabase's built-in SMTP has a very low sending rate limit and will return
`email rate limit exceeded` under normal usage. **Configure Custom SMTP before launch.**

Recommended providers:
- [Resend](https://resend.com) — simple setup, generous free tier
- [SendGrid](https://sendgrid.com)
- [Postmark](https://postmarkapp.com)

Configure at: **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**
