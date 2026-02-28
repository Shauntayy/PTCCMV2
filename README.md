# PTCCMV2

A full‑stack application combining a **Spring Boot** backend with a **React (Vite + TypeScript)** frontend. The backend exposes REST endpoints and connects to a PostgreSQL database; the frontend handles user interaction and communicates with the backend and a Supabase instance for authentication/storage.

---

## 🔧 Technologies

- **Backend**: Java 17, Spring Boot 4.x, Maven
- **Database**: PostgreSQL (H2 for in‑memory/testing)
- **Frontend**: React, TypeScript, Vite, ESLint
- **Authentication/Storage**: Supabase

---

## 🛠 Prerequisites

1. **Java 17** (or later) installed and `JAVA_HOME` configured.
2. **Maven** (the project includes the wrapper, so Maven is optional).
3. **Node.js** (v16+) and **npm** or **yarn** for the frontend.
4. A PostgreSQL database (local or remote) or a Supabase project for the backend.

---

## ⚙️ Backend Setup

1. Open a terminal in the workspace root.

2. _(Optional)_ If you prefer to use a local database, update `src/main/resources/application.yml` with your connection parameters or supply them via environment variables:

   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://<HOST>:<PORT>/<DB_NAME>?sslmode=require
       username: <USERNAME>
       password: <PASSWORD>
     jpa:
       hibernate:
         ddl-auto: update
       show-sql: true
   ```

   Alternatively set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` in your shell.

3. Build and run the application:

   ```bash
   # using the Maven wrapper
   ./mvnw clean package          # compile & run tests
   ./mvnw spring-boot:run        # start the backend on port 8080
   ```

   or simply `mvn spring-boot:run` if you have Maven installed globally.

4. The API base URL will be `http://localhost:8080` by default. You can browse the test controller at `/api/test` (see `TestController.java`).

5. Run tests with:

   ```bash
   ./mvnw test
   ```

---

## 🖥 Frontend Setup

1. Navigate to the frontend folder:

   ```bash
   cd ptccm-frontend
   ```

2. Install dependencies:

   ```bash
   npm install    # or yarn install
   ```

3. Create a `.env` file (or copy the provided example) with the following variables:

   ```dotenv
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_API_BASE_URL=http://localhost:8080   # matches backend
   ```

   Replace the Supabase URL and anon key with your project values. The frontend uses `VITE_` prefixes per Vite's convention.

4. Start the development server:

   ```bash
   npm run dev     # or yarn dev
   ```

   The app will be available at `http://localhost:5173` (default Vite port).

5. Build for production:

   ```bash
   npm run build
   npm run serve   # preview production build
   ```

---

## 🔄 Running Both Together

1. Start the backend first using the Maven commands above.
2. In a second terminal, start the frontend dev server.
3. The frontend will send requests to the backend using `VITE_API_BASE_URL`; ensure it matches the running backend.

You can also build the frontend and serve the static files from Spring Boot by copying the build output into the `resources/static` directory, though that is not configured by default.

---

## 📁 Project Structure

```
/           - Maven project root
├── pom.xml
├── src/main/java/com/ptccm/backend/   # Java source
├── src/main/resources/application.yml  # config
├── ptccm-frontend/                    # React app
    ├── src/
    └── .env                          # environment variables
```

---

## 📝 Notes

- The backend currently uses a Supabase‑hosted PostgreSQL instance as defined in `application.yml`. Change it if you need a local database.
- The frontend is a vanilla Vite React template; adjust ESLint and TypeScript settings as needed.
- For production deployment, secure your database credentials and keys (do **not** commit `.env` to source control).

---

Happy coding! 🚀
