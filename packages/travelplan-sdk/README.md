# @travelplan/sdk

TypeScript client for TravelPlan API `/api/v1`.

## Generate full client (OpenAPI Generator)

Requires [Java](https://adoptium.net/) installed.

```bash
cd backend
npm run docs:sdk
```

## Minimal stub usage

```ts
import { TravelPlanClient } from "@travelplan/sdk"

const api = new TravelPlanClient({ baseUrl: "http://localhost:5000" })
const { token } = await api.login("you@example.com", "Secret123!")
const authed = new TravelPlanClient({ baseUrl: "http://localhost:5000", token })
await authed.me()
```
