PTCCMV2 🔐

A full-stack authentication system built with Spring Boot + Supabase (PostgreSQL) + React.
It provides secure user authentication using Supabase and JWT validation in Spring Boot.

🧱 Tech Stack

Backend

Java 17

Spring Boot

Spring Security

Spring Data JPA

Supabase PostgreSQL

JWT Resource Server

Frontend

React (Vite)

Supabase JS Client

📦 Project Structure
PTCCMV2/
   ├── src/                → Spring Boot backend
   └── ptccm-frontend/     → React frontend
🚀 Prerequisites

Install these before running the project:

Tool	Version
Java	17+
Node.js	18+
Maven	(wrapper included)
Supabase	Active project
🗄️ Database Setup (Supabase)

Create a Supabase project
https://supabase.com

Go to:

Project Settings → API

Copy:

Project URL

Anon Public Key

Go to:

Settings → Database

Copy:

Host

Username

Password

Disable email confirmation (for development)

Authentication → Providers → Email
Turn OFF "Confirm email"
Ensure Email provider is ENABLED
⚙️ Backend Setup (Spring Boot)
1️⃣ Navigate to project root
cd PTCCMV2
2️⃣ Configure database connection

Open:

src/main/resources/application.yml

Ensure it matches your Supabase credentials:

spring:
  datasource:
    url: jdbc:postgresql://<SUPABASE_HOST>:5432/postgres?sslmode=require
    username: <USERNAME>
    password: <PASSWORD>

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json

Replace placeholders with your actual Supabase values.

3️⃣ Run backend
Windows
mvnw.cmd spring-boot:run
Mac / Linux
./mvnw spring-boot:run

Backend will start at:

http://localhost:8080
4️⃣ Test backend (optional)

Open:

http://localhost:8080/public/ping

You should see:

pong
⚛️ Frontend Setup (React)

Open a new terminal.

1️⃣ Navigate to frontend folder
cd ptccm-frontend
2️⃣ Install dependencies
npm install
3️⃣ Create .env file

Inside ptccm-frontend folder, create:

.env

Add:

VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=http://localhost:8080

Restart frontend if .env is modified.

4️⃣ Run frontend
npm run dev

Frontend runs at:

http://localhost:5173
🔐 How Login Works

User signs up via Supabase authentication

User logs in from React UI

Supabase returns a JWT access token

React sends token in request header:

Authorization: Bearer <token>

Spring Boot validates JWT using Supabase JWKS

Protected endpoints require valid authentication

🧪 Test Login in UI

Open:

http://localhost:5173

Sign up with an email + password

Sign in

Token is stored in Supabase session

Backend endpoints can now be accessed securely
