This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Live persona orchestration

H sessions emit `GRANNY_EVENT` narration, research, and frustration signals. GrannySmith speaks focused narration through Gradium and creates durable proposal-only fix jobs. Set `GRANNYSMITH_FIX_AGENT_MODE=codex` and `GRANNYSMITH_REPO_PATH=/absolute/path/to/product` to launch two read-only Codex proposal workers; otherwise the app returns a deterministic fallback brief.

## Human calibration and Granny Twin

Open `/calibrate` to record or upload a consented usability session. GrannySmith validates the media, extracts observable evidence with NVIDIA VSS or Nemotron when configured, and requires a human to edit and approve every behavioral rule. The approved proxy can then join the normal H Company panel through the generated lab link.

Configure `NVIDIA_VSS_URL` for full video-and-audio summarization. Without VSS, sampled frames use the existing `NVIDIA_API_KEY`; without either service, a deterministic reviewable profile keeps the local demo functional. Raw recordings and profiles default to the private `.grannysmith/` directory and should not be committed.

Completed calibrated runs can create proposal-only NemoClaw regression jobs. Set `NEMOCLAW_URL` for a managed runtime, or leave it blank to write durable local jobs to `GRANNYSMITH_NEMOCLAW_JOB_FILE`. Every job is limited to the target host, read-only repository investigation, and non-mutating output.

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
