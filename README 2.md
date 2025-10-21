# PDF Autofill SaaS Platform

A modern SaaS platform for uploading PDF forms, visually mapping fields, and generating filled PDFs with coordinate-based text placement.

## Features

- **Visual Field Mapper**: Click-to-map interface for PDF form fields
- **Coordinate-Based Filling**: Precise text placement using (x,y) coordinates
- **Multi-Page Support**: Handle complex PDF documents with multiple pages
- **UTF-8 Support**: Properly renders Spanish and international characters
- **Team Collaboration**: Multi-tenant architecture with organization support
- **API Access**: REST API for programmatic PDF generation
- **Supabase Backend**: Authentication, database, and file storage

## Tech Stack

- **Frontend**: Next.js 15 (App Router + React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **PDF Processing**: pdf-lib + @pdf-lib/fontkit + PDF.js
- **Backend**: Supabase (Auth + Database + Storage)
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand + TanStack Query

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/g0m/Desktop/tramite/pdf-autofill-saas
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > API to get your credentials
3. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Database Migrations

1. Go to Supabase Dashboard > SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL

This creates:
- Organizations, users, templates, template_fields, generated_pdfs tables
- Row-level security policies for multi-tenancy
- Storage bucket for PDFs
- Trigger to auto-create organization on signup

### 4. Configure Storage

1. Go to Supabase Dashboard > Storage
2. The "pdfs" bucket should be created automatically by the migration
3. If not, create it manually and make it public

### 5. Optional: Configure Google OAuth

1. Create OAuth credentials at https://console.cloud.google.com
2. Add to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

3. Add authorized redirect URI in Google Console:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

4. Enable Google provider in Supabase Dashboard > Authentication > Providers

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
pdf-autofill-saas/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Dashboard pages (protected)
│   │   ├── dashboard/       # Main dashboard
│   │   ├── templates/       # Template management
│   │   │   ├── new/         # Upload template
│   │   │   └── [id]/
│   │   │       └── map/     # Visual field mapper (CORE FEATURE)
│   │   ├── generate/        # Generate filled PDFs
│   │   ├── team/            # Team management
│   │   └── settings/        # Settings
│   ├── api/                 # API routes
│   │   ├── templates/
│   │   │   ├── upload/      # Upload PDF
│   │   │   └── [id]/fields/ # Save field coordinates
│   │   └── generate/        # Generate filled PDF
│   ├── layout.tsx           # Root layout
│   ├── providers.tsx        # Client providers (TanStack Query)
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── dialog.tsx
│   ├── layout/              # Layout components
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── pdf/
│       └── pdf-mapper.tsx   # Visual field mapping component
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── utils.ts             # Utilities (cn, formatFileSize, etc.)
├── types/
│   └── database.ts          # TypeScript types for database
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── tailwind.config.ts       # Tailwind configuration
├── next.config.js           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies

```

## Key Features Explained

### Visual Field Mapper

Located in `components/pdf/pdf-mapper.tsx`:

- Renders PDF using PDF.js on a canvas
- Click on PDF to add field markers
- Captures precise (x,y) coordinates
- Configurable field properties (name, type, fontSize)
- Multi-page support
- Real-time field list

**Usage:**
1. Upload a PDF template
2. Click on the PDF where fields should appear
3. Configure field name, label, type, and font size
4. Save field coordinates to database

### PDF Generation

Located in `app/api/generate/route.ts`:

- Loads template PDF from Supabase Storage
- Fetches field coordinates from database
- Uses pdf-lib to draw text at precise coordinates
- Supports multi-page PDFs
- Handles UTF-8 characters (Spanish, etc.)
- Returns download URL for generated PDF

**API Usage:**

```typescript
POST /api/generate
{
  "templateId": "uuid",
  "data": {
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    ...
  }
}
```

### Coordinate System

PDFs use bottom-left origin. The visual mapper converts screen clicks to PDF coordinates:

```typescript
// Screen Y to PDF Y conversion
const pdfY = pageHeight - screenY
```

Field coordinates are stored as:
```json
{
  "x": 189.37,
  "y": 623.88,
  "fontSize": 12,
  "page": 1
}
```

## Database Schema

### Organizations
- Multi-tenant isolation
- Plan-based limits (free, starter, pro, enterprise)
- Storage and PDF generation quotas

### Templates
- Belongs to organization
- Stores PDF URL (Supabase Storage)
- Supports public/private sharing
- Archive capability

### Template Fields
- Field coordinates (x, y)
- Field metadata (name, label, type)
- Font configuration (size, family)
- Validation rules

### Generated PDFs
- Audit trail of all generations
- Temporary storage (30-day expiry)
- Processing metrics

## Validation Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Full validation
npm run type-check && npm run lint && npm run build
```

## Deployment

### Render (Recommended)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm ci && npm run build`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`
6. Deploy!

### Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts and add environment variables.

## Environment Variables (Production)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Design System

Based on Factory.ai aesthetic:

- **Dark theme**: Modern, tech-forward look
- **Orange accent** (#FF7A00): Brand color for CTAs and highlights
- **Generous spacing**: Clean, breathable layouts
- **Smooth transitions**: 300ms duration for interactions
- **Typography scale**: Display, heading, body, caption variants

## API Documentation

### Upload Template

```
POST /api/templates/upload
Content-Type: multipart/form-data

Fields:
- file: PDF file (max 10MB)
- name: Template name
- description: Optional description
- category: Optional category

Response:
{
  "id": "uuid",
  "name": "Template name",
  "pdf_url": "https://...",
  "pdf_pages": 5
}
```

### Save Template Fields

```
POST /api/templates/{id}/fields
Content-Type: application/json

{
  "fields": [
    {
      "field_name": "nombre",
      "field_label": "Nombre completo",
      "field_type": "text",
      "page_number": 1,
      "x_coordinate": 189.37,
      "y_coordinate": 623.88,
      "font_size": 12
    }
  ]
}
```

### Generate PDF

```
POST /api/generate
Content-Type: application/json

{
  "templateId": "uuid",
  "data": {
    "nombre": "Juan Pérez",
    "email": "juan@example.com"
  }
}

Response:
{
  "success": true,
  "pdfUrl": "https://...",
  "fileName": "filled-form.pdf",
  "fileSize": 123456,
  "fieldsProcessed": 10,
  "processingTime": 1234
}
```

## Troubleshooting

### PDF.js Worker Error

If you see worker errors, ensure the worker script is accessible:

```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

### Supabase Storage Access

Make sure the "pdfs" bucket is public and storage policies are correctly set in the migration.

### Font Rendering Issues

For Spanish characters, ensure pdf-lib embeds the font:

```typescript
pdfDoc.registerFontkit(fontkit)
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run validation: `npm run type-check && npm run lint && npm run build`
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review the spec: `specs/WOR-001-pdf-autofill-saas-spec.md`
3. Create a new issue with reproduction steps

---

Built with Next.js 15, Supabase, and pdf-lib.
