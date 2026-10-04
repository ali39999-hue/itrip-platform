# FIRUZO CHILD — SPECIALIST CONTENT & CMS SPECIFICATION

**Authority:** Section 18 of Master Roadmap  
**Status:** Canonical Content Architecture Contract  

---

## 1. CMS Architecture & Non-Developer Publishing Goal

The Child platform CMS is structured around typed, component-based schemas rather than arbitrary unstructured HTML blobs.

### Acceptance Target
> A trained non-developer content editor can create, preview, approve, and publish a specialist vertical landing page or tour program without code changes.

---

## 2. Content Entities & Publishing Lifecycle

```text
Draft ──▶ In Review ──▶ Approved ──▶ Scheduled / Published ──▶ Archived
  ▲                                           │
  └───────────── Restore Previous ────────────┘
```

1. **`SpecialistPage`:** High-level composition document with slug, category (`technology`, `health_wellness`), and SEO metadata.
2. **`Section`:** Modular typed blocks (Hero, GoalWheel, ItineraryTimeline, AddonSelector, FAQ, RequirementsGrid).
3. **`ContentRevision`:** Immutable snapshot created on every save; enables instant one-click rollback.
4. **`PublicationSchedule`:** Date-effective visibility rules for time-sensitive trade fair and conference tours.

---

## 3. Modular Section Registry

| Section Key | Props Schema | Description |
|:---|:---|:---|
| `hero_banner` | `{ title, subtitle, badge, ctaLabel, ctaUrl, bgImageUrl }` | Impactful vertical hero with high contrast text |
| `goal_wheel` | `{ items: [{ key, title, icon, destination, count }] }` | Interactive carousel of professional travel objectives |
| `itinerary_timeline` | `{ days: [{ dayNumber, title, description, meals, hotel }] }` | Structured multi-day program schedule |
| `included_services` | `{ items: string[], excluded: string[] }` | Clear breakdown of inclusions and exclusions |
| `expert_profile` | `{ name, title, bio, photoUrl, credentials: string[] }` | Specialist guide or industry leader bio |
| `document_checklist` | `{ required: [{ title, description, sampleUrl }] }` | Clear visa and corporate document prerequisites |
| `faq_accordion` | `{ questions: [{ q, a }] }` | Collapsible question/answer blocks |

---

## 4. Internationalization & SEO Fields

- **Multi-locale Support:** Persian (`fa`), English (`en`), Arabic (`ar`), Chinese (`zh`), Russian (`ru`).
- **SEO Schema:**
  - `metaTitle`: Max 60 characters, locale-specific.
  - `metaDescription`: Max 155 characters.
  - `canonicalUrl`: Standardized self-referential URL.
  - `openGraphImage`: 1200×630px social card preview.
  - `structuredData`: Schema.org `TouristTrip` and `Event` JSON-LD generation.
