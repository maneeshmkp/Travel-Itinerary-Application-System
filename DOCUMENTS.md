# Travel Document Vault

Secure document storage for passports, visas, tickets, insurance, and more — with OCR, expiry reminders, AI search, and configurable cloud storage.

## Database schema

**Model:** `TravelDocument` (`backend/models/TravelDocument.js`)

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Owner (indexed) |
| `tripId` | ObjectId? | Optional trip link (indexed) |
| `documentType` | enum | passport, visa, flight_ticket, etc. |
| `title`, `description`, `country` | string | Metadata |
| `storageProvider` | enum | local, cloudinary, s3, azure |
| `storageKey`, `fileUrl` | string | Storage reference |
| `thumbnailKey`, `thumbnailUrl` | string | Image preview |
| `mimeType`, `fileSize` | | Validated on upload |
| `documentNumberEnc` | string | AES-256-GCM encrypted |
| `issueDate`, `expiryDate` | Date | expiryDate indexed |
| `issuer`, `tags`, `ocrText`, `ocrFields` | | Search & OCR |
| `isPersonal`, `isFavorite` | boolean | Vault organization |

**Indexes:** `userId`, `tripId`, `documentType`, `expiryDate`, text index on title/description/ocrText/tags.

## Storage architecture

Set `STORAGE_PROVIDER` in `.env`:

| Provider | Env vars |
|----------|----------|
| `local` (default) | `DOCUMENT_UPLOAD_DIR` (optional) |
| `cloudinary` | `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET` |
| `s3` | `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_S3_PREFIX` |
| `azure` | `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` + `@azure/storage-blob` |

### AWS S3 setup (production)

1. Create an S3 bucket (e.g. `travelplan-documents-prod`) and **block all public access**
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::YOUR_BUCKET/travel-documents/*`
3. Set in `backend/.env`:

```env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_PREFIX=travel-documents
BACKEND_URL=https://your-api.onrender.com
```

4. Restart backend — you should see: `Document storage: AWS S3 (bucket: ...)`

Objects are stored at `travel-documents/{userId}/{docId}/{filename}` with SSE-S3 encryption. Downloads use **presigned URLs** (private bucket safe).

**Flow:** `multer` (memory) → virus scan + MIME validation → `storeDocumentFile()` → optional `sharp` thumbnail → MongoDB record.

**Downloads:** HMAC-signed URLs (`DOCUMENT_SIGNING_SECRET`) valid 15 minutes. JWT or signed token required.

## OCR pipeline

1. Upload completes → `runDocumentOcr()` in `documentOCRService.js`
2. **Primary:** Gemini Vision (`GEMINI_API_KEY`) extracts structured JSON from images/PDFs
3. **Fallback:** Regex extraction for passport/visa/flight/PNR/dates from filename/text
4. Results stored in `ocrText` + `ocrFields` (searchable)

## Reminder scheduler

`runDocumentExpiryReminders()` runs every 15 min with other notification jobs:

| Document | Window |
|----------|--------|
| Passport | 180 days (6 months) |
| Visa | 30 days |
| Travel insurance | 1 day |
| Driving license | 30 days |

Notifications: `DOCUMENT_EXPIRING` with dedup keys per document/expiry date.

## Security model

- JWT on all CRUD routes (`protect`)
- Owner-only access (`userId` match)
- Document numbers encrypted at rest (`encryptToken`)
- MIME + magic-byte validation, executable blocking
- Signed download URLs (no public file listing)
- Optional cloud SSE (S3 AES256)

## API

| Method | Endpoint |
|--------|----------|
| GET | `/api/documents` |
| GET | `/api/documents/search?q=` |
| GET | `/api/documents/:id` |
| POST | `/api/documents` (multipart `file`) |
| PUT | `/api/documents/:id` |
| DELETE | `/api/documents/:id` |
| POST | `/api/documents/favorite/:id` |
| GET | `/api/documents/:id/download` |
| GET | `/api/trips/:id/documents` |
| GET | `/api/documents/missing?tripId=` |
| POST | `/api/ai/document-query` |

## Frontend

- **Hub:** `/documents` — full vault, stats, expiry timeline, favorites
- **Trip:** `#documents` section on itinerary detail
- **Navbar:** Documents link

## Testing

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Upload (replace TOKEN and use a test PDF/image)
curl -X POST http://localhost:5000/api/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@passport.pdf" \
  -F "documentType=passport" \
  -F "title=My Passport"

# 3. List
curl http://localhost:5000/api/documents -H "Authorization: Bearer TOKEN"

# 4. Search OCR
curl "http://localhost:5000/api/documents/search?q=passport" -H "Authorization: Bearer TOKEN"

# 5. Missing docs for trip
curl "http://localhost:5000/api/documents/missing?tripId=TRIP_ID" -H "Authorization: Bearer TOKEN"

# 6. AI query
curl -X POST http://localhost:5000/api/ai/document-query \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"When does my passport expire?"}'

# 7. Run expiry reminders manually
curl -X POST http://localhost:5000/api/notifications/scheduler/run \
  -H "Authorization: Bearer TOKEN"
```

**UI checklist:** Upload passport/visa/ticket → preview → favorite → search → filter expiring → trip missing checklist → AI questions.
