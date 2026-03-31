# Cloudflare Website Deployment

This file documents the correct Cloudflare deployment settings for the `website/` app in this repository.

## Use Pages, Not Workers

The public website is a static Next.js export.

Use a Cloudflare Pages project, not a Workers Builds project.

If Cloudflare requires a deploy command such as `npx wrangler deploy`, you are in the wrong product flow.

## Correct Project Settings

Use these values when creating or editing the Cloudflare Pages project:

- Framework preset: `Next.js (Static HTML Export)`
- Build command: `npm run build`
- Build output directory: `out`
- Path / root directory: `/website`

If the `Next.js (Static HTML Export)` preset is not available, use:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `out`
- Path / root directory: `/website`

## Environment Variables

Set this production environment variable in Cloudflare Pages:

- `NEXT_PUBLIC_APP_URL=https://app.thepolicyforge.com`

No database variables are required for the `website/` app.

## Why These Values Are Correct

- `website/next.config.js` sets `output: 'export'`
- Static export builds into the `out/` folder under `website/`
- `website/.env.production.example` defines `NEXT_PUBLIC_APP_URL`
- `website/components/ExternalNavbar.tsx` uses `NEXT_PUBLIC_APP_URL` for the login link

## Common Failure Modes

### 1. Missing build script

Example failure:

`npm error Missing script: "build"`

Meaning:

- Cloudflare is building from the wrong directory.

Fix:

- Set Path / root directory to `/website`

### 2. Deploy command tries to run `out`

Example failure:

`Executing user deploy command: out`

Meaning:

- `out` was entered as a deploy command.
- `out` is not a command. It is the build output directory.

Fix:

- Remove `out` from any deploy-command field.
- Use `out` only as the build output directory.

### 3. Output directory `website/out` not found

Example failure:

`Error: Output directory "website/out" not found.`

Meaning:

- Cloudflare is already building from `/website`
- The build output directory was set too deep as `website/out`

Fix:

- Keep Path / root directory as `/website`
- Set Build output directory to `out`
- Do not set it to `website/out`

The effective resolved output location should be:

- root directory: `/website`
- build output directory: `out`
- final built files found at: `website/out`

## How To Read The Latest Log

The latest log shows the build itself succeeded:

- repository cloned successfully
- path handling was applied
- dependencies installed
- `npm run build` ran inside the website project
- Next.js compiled successfully
- static pages were generated

The actual failure is only this line:

`Error: Output directory "website/out" not found.`

That means the output directory setting is wrong, not the application build.

## Required Final Configuration

Use exactly this configuration:

- Product: `Pages`
- Framework preset: `Next.js (Static HTML Export)`
- Build command: `npm run build`
- Build output directory: `out`
- Path / root directory: `/website`
- Environment variable: `NEXT_PUBLIC_APP_URL=https://app.thepolicyforge.com`

## Post-Deploy Steps

After the Pages deployment succeeds:

1. Add the custom domain `www.thepolicyforge.com`
2. Confirm the website loads on the Pages preview URL
3. Confirm the `LOGIN` link opens `https://app.thepolicyforge.com/login`
