# AutoNote Backend

The serverless backend for the AutoNote ecosystem, built to handle authentication, data persistence, and API requests for both the web dashboard and the Chrome extension.

## 🛠 Tech Stack

*   **Framework:** [Hono](https://hono.dev/) - A small, fast, and web-standard compliant web framework.
*   **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless execution environment.
*   **Database:** PostgreSQL (accessed via Prisma).
*   **ORM:** [Prisma](https://www.prisma.io/) (with `@prisma/extension-accelerate` for connection pooling).
*   **Validation:** [Zod](https://zod.dev/) - TypeScript-first schema declaration and validation.
*   **Language:** TypeScript.

## 🚀 Features

*   **Authentication:**
    *   User Sign Up & Sign In.
    *   JWT-based session management (`hono/jwt`).
    *   Email verification system.
*   **Note Management:**
    *   Create, Read, Update, Delete (CRUD) operations for notes.
    *   Update note content and titles.
*   **URL Management:**
    *   Store and retrieve URLs associated with notes.
*   **CORS Enabled:** Configured to allow requests from the web dashboard and extension.

## 📂 Project Structure

*   `src/index.ts`: Main entry point containing all API routes.
*   `src/middlewares/`: Custom middlewares for authentication and validation.
*   `prisma/schema.prisma`: Database schema definition.

## 🔧 Setup & Installation

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Ensure you have a `wrangler.toml` file configured with your Cloudflare account details and database connection strings (`DATABASE_URL`, `DIRECT_URL`).

3.  **Database Migration:**
    ```bash
    npx prisma migrate dev
    ```

4.  **Run Locally:**
    ```bash
    npm run dev
    ```

5.  **Deploy:**
    ```bash
    npm run deploy
    ```

## 🔗 API Endpoints

*   `POST /signup`: Register a new user.
*   `POST /signin`: Authenticate a user.
*   `POST /varification`: Send email verification code.
*   `POST /newfile`: Create a new note.
*   `POST /getnotes`: Fetch all notes for a user.
*   `POST /addcontent`: Update the content of a note.
*   `POST /updatetitle`: Update the title of a note.
*   `POST /deletefile`: Delete a note.
