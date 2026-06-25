# auth-systems

Open source authentication service built with Node.js and TypeScript. Free forever — for startups, side projects, and anyone who needs a solid auth foundation without reinventing the wheel.

> Pet project by [zborodayev1](https://github.com/zborodayev1) — built for job applications and real-world use.

---

## Features

- JWT-based authentication (access tokens)
- Password hashing with bcrypt
- Clean domain-driven structure (context / service / repository / router)
- TypeScript strict mode
- Express 5

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript 6 |
| Framework | Express 5 |
| Auth | JSON Web Token |
| Hashing | bcrypt |
| Config | dotenv |

---

## Project Structure

```
src/
├── config/          # App configuration (env, constants)
├── context/
│   └── auth/
│       ├── controllers/   # Request handlers
│       ├── services/      # Business logic
│       ├── repositories/  # Data access
│       ├── routers/       # Route definitions
│       └── index.ts       # Auth context entry
├── share/           # Shared types, interfaces, middleware
├── utils/           # Utility helpers
└── server.ts        # Entry point
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/zborodayev1/borodayev-auth-systems.git
cd borodayev-auth-systems
npm install
```

### Environment

Create a `.env` file in the root:

```env
PORT=3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

### Run

```bash
# Development (watch mode)
npm run start:dev

# Build
npm run build

# Production
npm start
```

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.
