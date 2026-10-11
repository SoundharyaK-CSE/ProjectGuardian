# Project Guardian
AI-powered software engineering platform for analyzing and implementing requirement changes.

## Prerequisites
- Node.js
- PostgreSQL
- OpenRouter API Key

## Setup
1. Run `npm run install:all` at the root directory.
2. Create `.env` in `backend/` by copying `backend/.env.example`.
3. Fill in your `OPENROUTER_API_KEY` and Postgres connection URL in `.env`.
4. Run the schema migrations from `database/schema.sql` in your Postgres database.

## Database Initialization
To initialize your database, make sure PostgreSQL is running locally, then:
```bash
psql -U postgres -d postgres -c "CREATE DATABASE project_guardian;"
psql -U postgres -d project_guardian -f database/schema.sql
```
Update your `backend/.env` with the connection string (e.g. `DATABASE_URL=postgres://postgres:password@localhost:5432/project_guardian`).

## Running the Application
From the root directory, run:
```bash
npm start
```

## Workspace Safety Rules
- Uploaded projects are safely unzipped using `multer` and `unzipper` with built-in path-traversal (Zip-Slip) protection.
- Projects are kept in `workspace/[analysis-id]/source/project`.
- The `source` directory is strictly immutable. All modifications happen in `workspace/[analysis-id]/update/project`.

## Upload & Scanner API
- `POST /api/analysis`: Create a new analysis record in PostgreSQL.
- `POST /api/analysis/:id/upload`: Uploads a ZIP file and extracts it to the safe workspace.
- `POST /api/analysis/:id/scan`: Recursively scans the workspace, categorizing files (frontend, backend, models, controllers, etc.) and storing the results generically into the analysis DB record.
- `GET /api/analysis/:id`: Retrieves the analysis state and canonical scan data.
