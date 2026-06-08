This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies and copy the environment template:

```bash
npm ci
cp .env.example .env.local
```

Then run the development server:

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

## Supabase Auth And Sync

The app works in local-only mode without Supabase. When a user signs in, local
saved words are merged into Supabase and future saved words and lesson progress
are synced across devices.

1. Create a Supabase project.
2. Run `supabase/migrations/202606090001_auth_learning_records.sql` in the
   Supabase SQL editor.
3. Add the project URL and anon key to `.env.local`.
4. In Supabase Auth email templates, configure the login email to show
   `{{ .Token }}` so users can enter the email verification code in `/login`.

Never expose the Supabase service-role key in this application. Row Level
Security in the migration restricts every record to its authenticated owner.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
