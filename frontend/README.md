[node]: https://nodejs.org/en
[pnpm]: https://pnpm.io/installation
[yarn]: https://yarnpkg.com/getting-started/install
[demo]: https://vite-react-ts-shadcn-ui.d1a.app/
[license]: https://github.com/doinel1a/vite-react-ts-shadcn-ui/blob/main/LICENSE
[code-of-conduct]: https://github.com/doinel1a/vite-react-ts-shadcn-ui/blob/main/CODE_OF_CONDUCT.md
[issues]: https://github.com/doinel1a/vite-react-ts-shadcn-ui/issues
[pulls]: https://github.com/doinel1a/vite-react-ts-shadcn-ui/pulls
[browserslist]: https://browsersl.ist/#q=last+3+versions%2C%3E+0.2%25%2C+not+dead
[commitlint]: https://github.com/conventional-changelog/commitlint/#what-is-commitlint
[react-icon]: https://skillicons.dev/icons?i=react
[ts-icon]: https://skillicons.dev/icons?i=ts
[js-icon]: https://skillicons.dev/icons?i=js
[tailwind-icon]: https://skillicons.dev/icons?i=tailwind
[chrome-icon]: https://github.com/alrra/browser-logos/blob/main/src/chrome/chrome_64x64.png
[firefox-icon]: https://github.com/alrra/browser-logos/blob/main/src/firefox/firefox_64x64.png
[edge-icon]: https://github.com/alrra/browser-logos/blob/main/src/edge/edge_64x64.png
[opera-icon]: https://github.com/alrra/browser-logos/blob/main/src/opera/opera_64x64.png
[safari-icon]: https://github.com/alrra/browser-logos/blob/main/src/safari/safari_64x64.png

# YT Insight Engine Frontend

YT Insight Engine helps creators answer one core question:

**What should I create next based on what is currently working in my niche?**

This frontend is built with Vite, React, TypeScript, Tailwind, and shadcn/ui, and is optimized for a sleek dark-only experience.

---

**[Demo][demo]** &nbsp;&nbsp;**|**&nbsp;&nbsp; **[Bug(label: bug)][issues]** &nbsp;&nbsp;**|**&nbsp;&nbsp; **[Feature(label: enhancement)][issues]**

---

## Getting Started

### Prerequisites

- Node.js
- pnpm

---

### Install and Run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Build

```bash
pnpm build
pnpm preview
```

[Back to :arrow_up:](#vite-react-typescript--shadcnui--template "Back to 'Table of contents' section")

---

## Frontend Scope (MVP)

- Conversion-focused landing page with clear value proposition
- Channel URL submission workflow
- Analysis status UI
- Recommendation-first dashboard
- Dark-only design system using:
  - Background `#171a1c`
  - Accent `#02e976`

[Back to :arrow_up:](#vite-react-typescript--shadcnui--template "Back to 'Table of contents' section")

---

## Documentation

See:

- `frontend/docs/README.md`
- `frontend/docs/features.md`
- `frontend/docs/how-it-works.md`
- `frontend/docs/progress-tracker.md`

[Back to :arrow_up:](#vite-react-typescript--shadcnui--template "Back to 'Table of contents' section")

---

## Notes

- No automated test-writing is in current MVP scope.
- Focus is shipping a usable recommendation engine quickly.
- Frontend expects backend API at `VITE_API_BASE_URL` (default `http://localhost:4000`).
