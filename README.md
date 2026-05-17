# Bookmark Notes

Bookmark Notes is an in-progress Chrome Extension for turning any webpage into a small contextual workspace.

The goal is to make a lightweight productivity sidepanel where users can create notes, todos, and workspaces tied to the pages they are browsing. It is designed as a compact Notion-style tool for research, learning, bookmarking, and task tracking directly inside Chrome.

## Features Implemented

- Chrome Manifest V3 extension
- Chrome Side Panel API integration
- Popup-based Supabase email/password authentication
- Multiple workspaces per page URL
- Editable workspace titles
- Notes editor
- Todo list with add, delete, toggle, and drag-and-drop reorder
- Search/filter workspaces and domain grouping view across saved URLs
- Two-view sidepanel flow:
  - workspace list
  - focused workspace detail page

## Tech Stack

- React
- Vite
- Chrome Extension Manifest V3
- Chrome Side Panel API
- Supabase Auth
- Supabase Postgres

## Local Setup

Install dependencies:

```bash
cd sidepanel
npm install
```

Create `sidepanel/.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Build the extension UI:

```bash
npm run build
```

Then load the project root as an unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the project root folder
5. Reload the extension after each new build

## Supabase Setup

The current cloud sync expects a `workspaces` table with user-owned rows and Row Level Security enabled.

The extension currently uploads local workspace data to Supabase with:

- Supabase UUID `id`
- local extension workspace ID stored as `local_id`
- `user_id` tied to the authenticated Supabase user
- `page_url`
- `domain`
- `title`
- `note`
- `todos`
- `color`
- `icon`
- timestamps

Manual upload sync is available in the popup after signing in.

## Status

Ongoing project. Core local workspace behavior is functional, and Supabase-backed account sync is being added incrementally.
