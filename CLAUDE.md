# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Development Commands

### Core Development Workflow

```bash
npm run dev          # Start development server with Turbo (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality with ESLint
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript validation without emitting files
npm run format       # Format code with Prettier
npm run format:check # Check code formatting without changes
```

### Testing Commands

```bash
npm test            # Run unit tests with Vitest
npm run test:watch  # Run tests in watch mode
npm run test:ui     # Run tests with web UI interface
```

### Pre-commit Hooks

The project uses Husky and lint-staged for automated code quality:

- ESLint fixes and Prettier formatting applied automatically on commit
- TypeScript files: `eslint --fix` + `prettier --write`
- JSON/CSS/MD files: `prettier --write`

## Architecture Overview

### Technology Stack

- **Next.js 15.3.5** - React framework with App Router and serverless API routes
- **React 19.1.0** - Latest React with server components
- **TypeScript 5.8.3** - Full type safety across frontend and backend
- **Tailwind CSS 3.4.16** - Utility-first styling with glassmorphism design
- **Vitest 3.2.4** - Fast unit testing with JSdom environment
- **node-ical 0.20.1** - iCal parsing and processing library

### Core Architecture Patterns

#### GUID-Based Collections System

The application uses a **stateless, in-memory collection system**:

- **No database** - All data stored in `globalThis.calendarCollections` during serverless function lifetime
- **GUID security** - Each collection identified by cryptographically secure UUID
- **Real-time aggregation** - Calendar feeds fetched and combined on-demand
- **Concurrent fetching** - Multiple calendar sources processed in parallel with timeout protection

#### API Route Structure

```
/api/collections          # Collection CRUD operations (POST, GET all)
/api/collections/[guid]   # Individual collection management (GET, PUT, DELETE)
/api/calendar/[guid]      # Main iCal feed endpoint for calendar apps
/api/calendars           # Calendar URL validation and testing
/api/events              # Event aggregation endpoints
/api/health              # Health check and status
```

#### Type System Architecture

All data flows through strongly-typed interfaces defined in `src/types/calendar.ts`:

- **CalendarCollection** - GUID-based collection with metadata
- **CalendarSource** - Individual calendar feed configuration
- **CalendarEvent** - Standardized event structure across sources
- **CombineResult** - iCal combination operation results

### Data Flow Patterns

#### Calendar Aggregation Flow

1. **Collection Creation** (`/api/collections`) - Validates URLs, creates GUID
2. **Feed Access** (`/api/calendar/[guid]`) - Retrieves collection, fetches calendars
3. **iCal Combination** (`lib/ical-combiner.ts`) - Merges raw iCal content
4. **Event Deduplication** - Removes duplicates by UID, preserves timezone data
5. **Response Delivery** - Returns combined iCal with proper headers

#### Validation Pipeline

Calendar URLs processed through `lib/calendar-utils.ts`:

- **URL Normalization** - Converts `webcal://` to `https://`
- **Format Validation** - Checks URL structure and reachability
- **Content Verification** - Validates iCal format and accessibility
- **Error Handling** - Provides detailed validation feedback

### Key Implementation Details

#### Raw iCal Processing

The application processes iCal at the **text level** rather than parsing to objects:

- **Event Extraction** - Preserves original formatting between `BEGIN:VEVENT`/`END:VEVENT`
- **Timezone Preservation** - Maintains `VTIMEZONE` definitions and references
- **Deduplication** - Uses UID extraction for duplicate removal
- **Combination** - Merges headers, timezones, events, and footers properly

#### Concurrent Fetching Strategy

`lib/calendar-fetcher.ts` implements robust concurrent processing:

- **Promise.allSettled** - Allows partial failures without breaking aggregation
- **Timeout Protection** - 15-second default timeout per calendar source
- **Error Isolation** - Individual calendar failures don't affect others
- **Result Aggregation** - Combines successful fetches, reports errors

#### Security Headers Configuration

`next.config.ts` implements comprehensive security:

- **CSP** - Content Security Policy with strict directives
- **HSTS** - HTTP Strict Transport Security for HTTPS enforcement
- **Frame Protection** - X-Frame-Options: DENY prevents embedding
- **Content Sniffing** - X-Content-Type-Options: nosniff prevents MIME attacks

### Frontend Architecture

#### Glassmorphism Design System

The UI implements modern glassmorphism effects:

- **Backdrop Blur** - CSS `backdrop-filter: blur()` for glass effects
- **Gradient Overlays** - Dynamic background gradients with animated blobs
- **Transparency Layers** - Semi-transparent panels with border highlights
- **Responsive Design** - Mobile-first approach with Tailwind breakpoints

#### Component Structure

```
src/components/ui/      # Reusable UI components
├── button.tsx         # Styled button variants
├── card.tsx           # Glass-effect card container
├── dialog.tsx         # Modal overlay system
├── error-boundary.tsx # React error handling
├── input.tsx          # Form input components
├── loading.tsx        # Loading state indicators
├── select.tsx         # Dropdown selection
└── toast.tsx          # Notification system
```

### Testing Strategy

#### Test Configuration

- **Vitest** with React Testing Library for component testing
- **JSdom** environment for DOM simulation
- **Coverage** with v8 provider for detailed metrics
- **Path Aliases** - `@/` mapped to `src/` for clean imports

#### Test Structure

```
src/__tests__/
├── setup.ts          # Test environment configuration
├── example.test.tsx  # Component testing examples
└── utils.test.ts     # Utility function tests
```

### Development Guidelines

#### File Organization

- **App Router** - API routes in `src/app/api/`, pages in `src/app/`
- **Library Code** - Utilities in `src/lib/`, types in `src/types/`
- **Components** - UI components in `src/components/`, hooks in `src/hooks/`
- **Styles** - Global CSS in `src/styles/`, Tailwind configuration in root

#### Code Quality Standards

- **TypeScript Strict Mode** - No `any` types, full type coverage required
- **ESLint Rules** - Next.js recommended configuration with additional rules
- **Prettier Formatting** - Automated code formatting on save and commit
- **Import Organization** - Group external, internal, and relative imports

#### API Development Patterns

- **Error Handling** - Consistent error response format with status codes
- **Validation** - Zod schemas for request/response validation
- **Headers** - Proper content-type headers for iCal feeds
- **Caching** - Appropriate cache-control headers for calendar content

#### Environment Configuration

- **Node.js 18.17.0+** - Required for latest Next.js features
- **Turbo Mode** - Enabled for faster development builds
- **Hot Reload** - Automatic refresh on file changes during development

### Common Development Tasks

#### Adding New API Endpoints

1. Create route handler in `src/app/api/[route]/route.ts`
2. Define request/response types in `src/types/calendar.ts`
3. Implement validation using existing patterns
4. Add error handling following established conventions
5. Update OpenAPI spec if maintaining API documentation

#### Implementing New Calendar Sources

1. Extend `CalendarSource` interface if needed
2. Add URL validation logic in `calendar-utils.ts`
3. Update fetching logic in `calendar-fetcher.ts`
4. Test with real calendar URLs from the source
5. Handle source-specific iCal format variations

#### UI Component Development

1. Follow existing glassmorphism design patterns
2. Use Tailwind utility classes for consistency
3. Implement proper TypeScript props interfaces
4. Add error boundaries for robust error handling
5. Ensure responsive design across breakpoints

#### Testing New Features

1. Write unit tests for utility functions
2. Create component tests for UI elements
3. Test API endpoints with various input scenarios
4. Validate iCal output with calendar applications
5. Verify error handling and edge cases
