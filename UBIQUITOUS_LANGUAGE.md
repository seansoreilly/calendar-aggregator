# Ubiquitous Language

## Collections

| Term                | Definition                                                                                     | Aliases to avoid                        |
| ------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Collection**      | A named, persisted set of calendar sources addressable by a single collection ID               | Calendar group, aggregation, feed group |
| **Calendar Source** | One upstream iCal URL that contributes events to a collection                                  | Calendar, source, feed URL              |
| **Combined Feed**   | The single iCal document produced by merging all of a collection's sources, served per request | Output calendar, aggregate, the feed    |
| **Partial Feed**    | A combined feed in which at least one calendar source failed to fetch (served as HTTP 206)     | Degraded feed, incomplete feed          |

## Identity

| Term              | Definition                                                                            | Aliases to avoid             |
| ----------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| **Collection ID** | The identifier a collection is addressed by; either a UUID or a Custom ID             | guid (see below)             |
| **UUID**          | A machine-generated v4 identifier for a collection, matched exactly                   | GUID, auto ID                |
| **Custom ID**     | A user-chosen slug for a collection (e.g. `seansoreilly`), matched case-insensitively | Vanity ID, slug, custom GUID |

## Feed assembly

| Term                    | Definition                                                                 | Aliases to avoid   |
| ----------------------- | -------------------------------------------------------------------------- | ------------------ |
| **Event**               | A `VEVENT` block from a calendar source, identified by its UID             | Entry, appointment |
| **UID**                 | The iCal-level unique identifier of an event (distinct from Collection ID) | ID, event GUID     |
| **Timezone Definition** | A `VTIMEZONE` block, deduplicated across sources by TZID                   | Timezone, TZ block |

## Storage

| Term                 | Definition                                                                                                      | Aliases to avoid       |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Primary Store**    | The Supabase table `calendar_aggregator.collections` where collections persist                                  | The database, Supabase |
| **Fallback Storage** | The in-memory `globalThis.calendarCollections` map used when the primary store errors                           | Local storage, cache   |
| **Silent Fallback**  | The anti-pattern where a primary-store error is swallowed and fallback storage pretends the operation succeeded | Graceful degradation   |

## Relationships

- A **Collection** has exactly one **Collection ID** and one or more **Calendar Sources**
- A **Combined Feed** is assembled fresh on each request from a **Collection**'s sources
- An **Event** originates from exactly one **Calendar Source** but appears at most once in the **Combined Feed** (deduplicated by **UID**, first occurrence wins)
- A **Partial Feed** is still a valid **Combined Feed** — it simply omits the events of failed sources
- **Fallback Storage** shadows the **Primary Store**; on Vercel it is empty on every cold start, so a **Silent Fallback** surfaces as a missing **Collection** (404), not an error (500)

## Example dialogue

> **Dev:** "When a client hits `/api/calendar/{id}`, do we serve a cached **Combined Feed**?"
>
> **Domain expert:** "No — the **Combined Feed** is assembled on every request. We fetch each **Calendar Source** in parallel and merge the **Events**."
>
> **Dev:** "And if one **Calendar Source** is down?"
>
> **Domain expert:** "We still serve a **Partial Feed** with the events we got, marked HTTP 206. A single dead source never takes down the whole collection."
>
> **Dev:** "The route param is called `guid`, but `seansoreilly` isn't a GUID. Is that a bug?"
>
> **Domain expert:** "It's a naming wart. The param is really a **Collection ID**, which is either a **UUID** — matched exactly — or a **Custom ID** — matched case-insensitively. Don't confuse either with an event **UID**, which only identifies an event inside a feed."

## Flagged ambiguities

- **"guid" is a misnomer.** The route param `[guid]`, the DB column, and function names (`findCollectionByGuidInDatabase`) all say "guid", but the value is often a **Custom ID** slug, not a GUID/UUID at all. In conversation and docs, prefer **Collection ID** as the umbrella term, with **UUID** and **Custom ID** as its two forms. Renaming the code is not required — but new code should not deepen the confusion.
- **"calendar" is overloaded three ways:** an upstream source (**Calendar Source**), the merged output (**Combined Feed**), and the subscribing client ("calendar apps"). The code compounds this: the type is `CalendarSource` but the request/record field is `calendars`. Prefer **Calendar Source** and **Combined Feed**; say "calendar app" only for the consuming client.
- **"feed" cuts both ways** — source URLs are sometimes called feeds, and the output endpoint is "the feed". Reserve bare "feed" for the output (**Combined Feed** / **Partial Feed**); an input is always a **Calendar Source**.
- **"fallback" sounds safer than it is.** **Fallback Storage** is not a durable degraded mode — on serverless it is empty per cold start. Calling the **Silent Fallback** "graceful degradation" hides that reads silently return "not found" after any DB failure.
