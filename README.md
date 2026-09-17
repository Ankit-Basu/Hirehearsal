# Hirehearsal

**Rehearse the hire.** Hirehearsal is an AI mock interview platform. Ora, the AI interviewer, runs technical, project, HR and full-loop interviews out loud, adapts difficulty to your answers, and hands you a scorecard with rubric scores, speaking analytics and concrete next steps.

> Status: the Spring Boot API is complete. The Next.js web app is being rebuilt next.

## Features

- **Four interview formats**: Technical round, Project deep-dive, HR & behavioral, and a Full loop that mixes them like a real interview.
- **Three interviewer personas**: Mentor, Panelist and Bar Raiser, each with their own tone, starting difficulty and scoring strictness.
- **Adaptive difficulty**: every answer moves the next question between foundation, core and stretch tiers.
- **Job-description tailoring**: paste a JD and technical questions follow the skills it mentions.
- **AI evaluation with a safety net**: Groq-hosted LLMs score answers on substance, clarity and depth. If the model is unavailable, a transparent heuristic coach and a curated 126-question bank take over.
- **Multi-key rotation**: several Groq keys are rotated round-robin; a rate-limited or rejected key is parked and the next one is used.
- **Scorecards**: overall band, rubric averages, words per minute, filler words, highlights, focus areas, and an outline of what a strong answer covers for every question.
- **Retry drills**: re-practice specific questions from any scorecard.
- **Accounts and progress**: JWT sign-in, interview history, a readiness score, streaks and weekly goals. Guests can practice without an account and claim their interviews later.
- **Community insights**: anonymous aggregate statistics.

## Architecture

```text
Next.js web app ──/api/*──▶ Spring Boot API (port 8085)
                              ├── Security: stateless JWT (HS256), per-client rate limiting
                              ├── interview: InterviewService ── short transactions + optimistic locking
                              ├── coach: CoachService
                              │     ├── OpenAiCompatibleGateway ──▶ Groq (rotating key pool)
                              │     └── HeuristicCoach + QuestionBank (offline fallback)
                              ├── progress / insights: aggregate queries
                              └── Spring Data JPA ──▶ H2 (dev) · PostgreSQL (prod)
```

The question bank and all coaching copy live in [`shared/question-bank.json`](shared/question-bank.json), so the API and the web app's offline mode share one source of truth.

## Tech stack

| Layer | Technology |
| --- | --- |
| API | Java 17, Spring Boot 4.1, Spring Security (OAuth2 resource server, JWT), Spring Data JPA, Bean Validation |
| AI | Groq OpenAI-compatible API (`openai/gpt-oss-120b` by default), Spring `RestClient` |
| Data | H2 (development), PostgreSQL (production) |
| Docs & ops | springdoc OpenAPI / Swagger UI, Actuator health probes, RFC 9457 problem details, Docker |
| Tests | JUnit 5, AssertJ, MockMvc integration tests (36 tests) |

## Running the API locally

Prerequisites: JDK 17+ and Maven 3.9+.

1. Create `backend/.env` from the example and add your Groq keys:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Start the API:

   ```bash
   cd backend
   mvn spring-boot:run
   ```

   If your `~/.m2/settings.xml` routes downloads through a private mirror that is offline, use Maven Central directly:

   ```bash
   mvn -s .mvn/central-settings.xml spring-boot:run
   ```

3. Explore it:
   - Swagger UI: http://localhost:8085/swagger-ui.html
   - Status: http://localhost:8085/api/status
   - H2 console (dev): http://localhost:8085/h2-console (JDBC URL `jdbc:h2:file:./data/hirehearsal`)

Without keys the API still works, using the offline coach.

### Tests

```bash
cd backend
mvn test
```

## API overview

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/interviews` | Start an interview (guest or signed in) |
| `POST` | `/api/interviews/{id}/answers` | Answer the open question; returns the evaluation and the next question |
| `POST` | `/api/interviews/{id}/hint` | Get a hint (costs one point) |
| `POST` | `/api/interviews/{id}/finish` | Save the post-interview confidence and reflection |
| `GET` | `/api/interviews/{id}` | Scorecard (shareable by link) |
| `POST` | `/api/auth/register`, `/api/auth/login` | Get a bearer token |
| `GET/PATCH` | `/api/me` | Profile, target role, weekly goal |
| `GET` | `/api/me/interviews` | Interview history |
| `GET` | `/api/me/progress?tz=Asia/Kolkata` | Readiness, streak, weekly goal, trends |
| `POST` | `/api/me/claim` | Attach guest interviews to the account |
| `GET` | `/api/insights` | Anonymous community statistics |
| `GET` | `/api/status` | Engine status (never exposes keys) |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GROQ_API_KEYS` | none | Comma-separated Groq keys (or `GROQ_API_KEY` for one) |
| `HIREHEARSAL_LLM_MODEL` | `openai/gpt-oss-120b` | Any chat model your provider serves |
| `HIREHEARSAL_LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Any OpenAI-compatible endpoint |
| `HIREHEARSAL_LLM_REASONING_EFFORT` | `low` | Blank for models without reasoning controls |
| `HIREHEARSAL_JWT_SECRET` | dev-only value | Required in the `prod` profile (32+ bytes) |
| `HIREHEARSAL_CORS_ORIGINS` | `http://localhost:3000` | Allowed browser origins |
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | H2 file | Production database |
| `PORT` | `8085` | HTTP port |

## Docker

```bash
docker build -f backend/Dockerfile -t hirehearsal-api .
docker run -p 8085:8085 -e GROQ_API_KEYS=... -e HIREHEARSAL_JWT_SECRET=... hirehearsal-api
```

## Responsible AI

Ora always introduces itself as an AI. Scores are practice signals, not hiring decisions. Candidate text is framed as data in every prompt, and API keys are never logged or returned by the API.

## License

MIT
