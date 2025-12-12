# Commercial Enablement - Use Cases & Pricing (R1.0, draft v0.1)

Status: draft (M1)  
Scope: R1.0 - Intent & Pre-Sales OS for X  
Version: 0.1  
Date: 2025-12-10  
Author: CTO (Mieszko 2.0)  
Related issues: #1 Phase1_MVP-Spec, #2 BCOS Data & Event Model, #7 Commercial Enablement - Use Cases & Pricing

---

## 0. Purpose and scope

This document defines the commercial enablement view for release **R1.0 - "Intent & Pre-Sales OS for X"**.

It is the working contract between CEO, CTO and go-to-market for:

- which **use cases** we actively sell in R1.0,
- where the **boundary between free / beta and paid usage** sits,
- what the main **pricing dimensions** are,
- which **product metrics and events** must be available from day one,
- what **copy** we use in early website and sales materials.

The document is **M1 level**:

- concrete enough for implementation (instrumentation, feature flags, CRM setup),
- numeric price points and marketing names can be adjusted later without changing product behaviour.

---

## 1. Context, ICP and commercial roles

### 1.1 R1.0 scope reminder (commercial view)

R1.0 delivers a narrow but high-impact slice of the full Enabion vision:

- X-side **Intent Engine** - turning messy client/internal requests into structured Intents.
- **Avatars** - System Avatar, Organisation Avatar X, Intent Coach / Brief Scanner.
- X-side **pre-sales pipeline**: New -> Clarify -> Match -> Commit -> Won / Lost.
- **Minimal Y involvement** - Y can receive Intents, respond with "interested / not interested" and send a short reply.
- **NDA & confidentiality model** - L1/L2 and NDA layers 0/1.
- **Multilingual behaviour** - PL / DE / NL markets, EN as default / fallback.

No project containers, Trust Rooms, Hubs, ODR, financial layer or full Organisation Dashboard are part of R1.0.

### 1.2 ICP and who pays

**ICP X (primary payer)**

- Companies that commission IT / Tech / Software work and own the budget and risk.
- Typical size 5-500 FTE.
- Have recurring pipeline of projects and collaboration with multiple vendors Y.
- Roles:
  - X-BD / AM - primary hands-on user.
  - X-CEO / COO / Head of Pre-Sales - pipeline owner and decision maker.
  - X-PM - light involvement to sanity-check feasibility before Commit.

**Y (vendors)**

- Software houses, agencies, consultancies, integrators, startups.
- In R1.0 they have **minimal value flow**:
  - receive Intents,
  - decide "interested / not interested",
  - respond briefly,
  - see final status (Won / Lost / No decision).
- No Y-side pipeline, multi-seat governance or analytics yet.

**Who pays in R1.0**

- **Primary payer:** X (client) - they buy the Commercial Enablement layer (Intent + pre-sales OS for X).
- **Y:** free / light org-accounts in R1.0, used to reduce friction and enable multi-player flows. Monetisation of Y is R2.0+.

---

## 2. Primary use cases for X (R1.0)

This section captures the **core commercial scenarios** that R1.0 supports and that sales / marketing should lead with. Each use case maps to journeys defined in the MVP Product Spec, but is written in sales language.

### UC1 - From messy request to clear Intent

**Actors**

- X-BD / AM (primary)
- Intent Coach and System Avatar
- optionally X-CEO / COO, X-PM (review)

**Trigger**

- X receives a messy brief (external RFP, internal email, meeting notes) related to IT / Tech work.

**Flow (short)**

1. X-BD pastes the raw text into Intent Coach or forwards an email to Enabion.
2. Avatar turns it into a structured Intent (objective, context, scope, constraints, KPIs, risks).
3. Avatar highlights missing information and contradictions.
4. X-BD edits, accepts / rejects suggestions and saves the Intent.
5. Intent appears in the pipeline in New / Clarify stage.

**Business value**

- Less time spent cleaning up requests.
- Fewer misunderstandings later in pre-sales and delivery.
- Shared language across BD, PM and leadership for what is being considered.

---

### UC2 - One pre-sales pipeline for all Intents at X

**Actors**

- X-BD / AM (per-Intent owners)
- X-CEO / COO / Head of Pre-Sales (view over all Intents)
- System Avatar (alerts on stuck Intents)

**Trigger**

- X has multiple Intents across clients / internal sponsors and needs a single view of pre-sales activity.

**Flow (short)**

1. Intents created in UC1 are visible on a single Pipeline board (New -> Clarify -> Match -> Commit -> Won / Lost).
2. Each Intent has an owner, stage, language, basic tags and risk indicators.
3. CEO / COO can filter by owner, sector, client, language, vendor involvement.
4. System Avatar warns about Intents stuck in stages (e.g. long in Clarify or Match).

**Business value**

- Single source of truth for pre-sales instead of scattered spreadsheets and mail threads.
- Better decisions where to invest pre-sales effort.
- Easy to spot risk (e.g. too many open Intents with same vendor or team).

---

### UC3 - Invite vendors Y under a standard NDA and keep everything in one place

**Actors**

- X-BD / AM
- Y-BD / AM (minimal)
- System Avatar, NDA model

**Trigger**

- X wants to invite selected vendors Y to an Intent and share more than L1-level information.

**Flow (short)**

1. X activates Enabion Mutual NDA once per organisation.
2. For a given Intent, X chooses which vendors Y to invite (existing or new).
3. For L1 Intents, Y can see details without NDA; for L2, Y must accept Mutual NDA first.
4. Y sees an "Incoming Intents" list, marks "interested / not interested" and sends a short response (optionally with one attachment).
5. X can keep all Y responses linked to the same Intent.

**Business value**

- NDA friction reduced to one Mutual NDA per org instead of bespoke paperwork for every vendor.
- Less chaos: all responses, decisions and confidentiality levels stay linked to the Intent.
- Faster and safer vendor invitations, especially for smaller X with weak legal resources.

---

### UC4 - Decide who to commit to (GO / NO-GO) with traceable logic

**Actors**

- X-BD / AM
- X-CEO / COO / Head of Pre-Sales
- X-PM (sanity check)
- System Avatar, Organization Avatar X, TrustScore

**Trigger**

- X needs to decide whether to proceed with a given vendor Y for an Intent.

**Flow (short)**

1. For each invited Y, X sees:
   - Intent summary and clarifications,
   - Y's response and status (interested / not interested),
   - NDA status (Layer 0 or Layer 1),
   - behavioural TrustScore snapshots for both X and Y.
2. Org Avatar X can surface risks (e.g. unclear scope, missing KPIs, aggressive timeline).
3. Decision maker at X records a GO / NO-GO decision for a specific X-Y Engagement.
4. The decision becomes part of the event log and pre-sales history.

**Business value**

- Clear, auditable story why vendor Y was chosen or rejected.
- Exposure of hidden risks before contract signature.
- Input signals for future TrustScore and governance layers.

---

## 3. Packaging and boundary between free / beta and paid

The goal is to keep packaging **simple and X-centric** in R1.0, while leaving room for:

- multi-seat Org Dashboard (R1.1),
- full Y OS and Hubs (R2.0+),
- enterprise / regulated models (R4.0+).

### 3.1 Packaging primitives

We use three primitives in R1.0:

1. **Organisation (Org)** - the tenant; can be of type X, Y or BOTH.
2. **Seat** - a named user in an Org with non-trivial access (BD/AM, PM, manager).
3. **Intent volume** - number of active / created Intents per Org over time.

R1.0 has only one commercial plan for paying customers, plus a free / trial layer. More granular segmentation can be added later without breaking data model.

### 3.2 Plan A - Free / Trial (single-user sandbox)

Target:

- Very small X (or individuals inside larger X) testing Enabion on a few Intents.
- Vendors Y responding to invites who do not yet want a full OS.

Characteristics:

- 1 Org, 1 primary seat (X-BD) plus optional 1 viewer seat (e.g. manager).
- Access to:
  - Intent creation (all three modes),
  - Avatars (System, Org X, Intent Coach) with standard limits,
  - basic pipeline board,
  - minimal Y flow (sending invites to a small number of vendors, responses stored against the Intent),
  - Mutual NDA for X and invited Y.
- **Usage constraints (conceptual):**
  - limited number of active Intents per Org,
  - limited number of invited vendors per Intent,
  - limited duration of trial (e.g. time-boxed beta),
  - no guaranteed support / SLA.

Upgrade triggers (examples):

- Org exceeds low-volume Intent usage over a period (e.g. running many Intents in parallel).
- Org wants more than one active BD/AM seat.
- Org wants higher support / onboarding.

Exact numeric thresholds are defined in commercial policy, not in code; product only needs **counters and flags**.

### 3.3 Plan B - Early X (paid Org plan)

Target:

- X with repeatable pre-sales pipeline (multiple Intents per quarter) and at least one dedicated BD/AM.
- SMEs and mid-market firms that want Enabion as their default Intent & pre-sales OS.

Characteristics:

- Priced **per active seat** at X with a minimum commitment per Org.
- Each Org gets a **pooled allowance** of active Intents suitable for normal use; above that, commercial team can enforce upgrades or overage if needed.
- Included features:
  - everything from Plan A,
  - ability to onboard several seats (BD/AM, PM, managers),
  - basic organisation-level analytics and exports (as available in R1.0),
  - higher limits on Intents and vendor invitations,
  - inclusion in structured beta programs / feedback loops.

Upgrade paths:

- As R1.1 and R2.0 add Org Dashboard, multi-seat governance and BCOS containers, they will land as **additive value** on top of this plan, not as separate products.

### 3.4 Plan C - Y-light (vendor side, free)

Target:

- Vendors Y invited by paying X.
- Startups and service providers that need a low-friction way to respond to Intents.

Characteristics:

- Free, limited Org account of type Y.
- Capabilities:
  - basic organisation profile,
  - Incoming Intents list,
  - "interested / not interested" decisions,
  - short responses and one attachment per Intent,
  - visibility of final Intent status.
- No Y-side pipeline, Org Dashboard, Hubs or advanced analytics.

Future:

- R2.0+ may introduce paid Y plans with full pre-sales OS; Plan C becomes the zero-cost entry point.

---

## 4. Pricing model and main dimensions

### 4.1 Design goals

- **Align with value** - customers pay in proportion to how many people at X run pre-sales in Enabion and how intensively they use Intents.
- **Stay simple** - R1.0 pricing must be easy to explain in a single slide.
- **Future-proof** - works with later layers (Org Dashboard, Hubs, TrustGraph) without radical changes.

### 4.2 Main dimensions (R1.0 decision)

1. **Primary dimension - per active seat at X**

   - Seat = named user at X with permission to create or edit Intents or manage pipeline.
   - Viewer-only roles (e.g. CEO, CFO) can be priced at a discount or bundled; exact commercial policy is flexible.
   - Seat count is the main lever for revenue in R1.0.

2. **Secondary dimension - Intent volume bands per Org**

   - Enabion tracks per-Org, per-month:
     - created Intents,
     - active Intents (not yet Won / Lost),
     - invited vendors per Intent.
   - Commercial team defines non-blocking **bands** (e.g. "normal", "heavy") and decides when to:
     - propose plan upgrade,
     - apply fair-use limits,
     - negotiate custom agreements.

3. **Non-dimensions in R1.0**

   - No per-Intent micro-billing.
   - No per-vendor-invite fees.
   - No direct monetisation of Y-side free accounts.

Numeric price levels, contract terms and discounts are defined in the commercial playbook and CRM, not in this document.

---

## 5. Required product metrics and events (R1.0)

R1.0 must provide enough telemetry to:

- monitor health and adoption,
- support current TrustScore MVP,
- inform future pricing and packaging.

The tables below list **metrics** and the **events / fields** that need to exist in the product and data model. Exact event schemas follow the BCOS Data & Event Model v1.

### 5.1 Accounts and seats

**Metrics**

- Number of organisations by type (X / Y / BOTH).
- Number of active organisations per month.
- Number of active seats per Org and in total.
- Seat mix: BD/AM vs PM vs viewer roles.
- Trial -> paid conversion rate (Org-level).

**Required events / data**

- `ORG_CREATED`, `ORG_STATUS_CHANGED` (invited, trial, active, suspended).
- `USER_INVITED`, `USER_ACTIVATED`, `USER_DEACTIVATED`.
- User role and seat type per Org.
- Org type (X / Y / BOTH).

### 5.2 Intents and pipeline

**Metrics**

- Intents created per Org / per month.
- Active Intents per Org.
- Distribution of Intents by:
  - pipeline stage (New / Clarify / Match / Commit / Won / Lost),
  - sector, technology, country, language.
- Stage conversion rates (New -> Clarify, Clarify -> Match, Match -> Commit, Commit -> Won).
- Average time spent in each stage.
- Cancelled / archived Intents.

**Required events / data**

- `INTENT_CREATED`, `INTENT_UPDATED`.
- Pipeline stage changes (stored either as dedicated events or as part of `INTENT_UPDATED` payload).
- Intent attributes: owner, sector, tech stack, region, language, budget signal, max confidentiality level.
- Archive / delete markers and timestamps.

### 5.3 Avatars and AI usage

**Metrics**

- Number of Avatar sessions per type (System, Org X, Intent Coach).
- Number of suggestions issued, accepted and rejected.
- Percentage of Intents that went through Avatar assistance.
- Frequency of "I don't know / need more information" responses.

**Required events / data**

- `AVATAR_SUGGESTION_ISSUED`.
- `AVATAR_SUGGESTION_ACCEPTED`.
- `AVATAR_SUGGESTION_REJECTED`.
- Avatar type, suggestion kind, target field, acceptance mode.
- Optional flag / field for "IDK" responses.

### 5.4 Vendor Y involvement

**Metrics**

- Number of vendors Y invited per Intent and per Org.
- Interest rate: "interested" vs "not interested" vs "no response".
- Average response time of Y to Intents.
- Number of Intents where at least one Y responded.

**Required events / data**

- `ENGAGEMENT_CREATED` (X-Y created for an Intent).
- Y interest / status changes (can be modelled as `ENGAGEMENT_STAGE_CHANGED` or equivalent).
- Y response timestamps and basic metadata (length, attachment flag).
- Links between Intents, Engagements and Orgs.

### 5.5 NDA and confidentiality

**Metrics**

- Number of Orgs that accepted Mutual NDA.
- Number of Intents with L2 enabled vs L1 only.
- L2 usage vs NDA status for X and Y.
- Time from first L2 attempt to NDA acceptance.

**Required events / data**

- `NDA_ACCEPTED` events with layer, parties and timestamps.
- Intent fields for max confidentiality level and NDA requirements.
- Org-level NDA status.

### 5.6 TrustScore MVP

**Metrics**

- TrustScore distribution across Orgs.
- Average score by Org type (X / Y).
- Correlation of TrustScore with:
  - response time,
  - NDA adoption,
  - Intent / Engagement volume.

**Required events / data**

- `TRUST_SCORE` snapshots per Org (as defined in BCOS model).
- Signals used in TrustScore computation:
  - profile completeness,
  - responsiveness metrics,
  - engagement metrics,
  - NDA adoption.

### 5.7 Activation, retention and engagement

**Metrics**

- First-week and 30-day activation rates for new Orgs.
- DAU / WAU / MAU per role.
- Feature adoption:
  - percentage of Orgs using Intent Coach,
  - percentage of Orgs inviting vendors Y,
  - percentage of Orgs activating Mutual NDA.

**Required events / data**

- Login / session events or equivalent.
- Feature-level events (e.g. first Intent created, first vendor invited, first NDA accepted).
- Org-level flags for key milestones.

---

## 6. Marketing copy - website and one-pager (draft)

This section provides **ready-to-use text** for early website and sales one-pager. It only mentions features that actually exist in R1.0.

### 6.1 One-sentence pitch

> Enabion turns messy client emails and internal requests into clear Intents and a transparent pre-sales pipeline - so X can choose the right vendors faster and with less risk.

### 6.2 Website hero section (draft)

**Headline**

From messy pre-sales to one Intent pipeline.

**Sub-headline**

If you commission IT and tech work, Enabion is an AI-native OS that transforms inbound requests into structured Intents, supports your BD team with Avatars, and keeps all pre-sales decisions in one place.

**Key benefits (bullets)**

- Go from chaotic emails and RFPs to a single standard for describing what you need.
- See all Intents and stages in one pipeline - across clients, vendors and internal sponsors.
- Use Avatars to clarify scope, risks and missing information instead of writing everything from scratch.
- Invite vendors under a single Mutual NDA and keep their responses linked to the Intent.
- Make GO / NO-GO decisions with better context and a behavioural TrustScore, not just gut feeling.

**Call to action**

Start with your next client email - forward it to Enabion and see the Intent appear.

### 6.3 Sales one-pager - narrative skeleton

Sections:

1. **Problem - pre-sales chaos at X**
   - Requests arrive via email, chat and slides.
   - Each BD/AM has a private spreadsheet.
   - Legal gets pulled in late, NDA work is slow.
   - Management has no up-to-date view of the pipeline.

2. **Solution - Enabion R1.0**
   - Standard Intent structure for every request.
   - AI-assisted clarification of scope, KPIs and risks.
   - One pre-sales pipeline across the organisation.
   - Vendor invitations and NDAs managed in one place.

3. **Who it is for**
   - Companies commissioning IT / Tech / Software projects.
   - Teams responsible for AI / digital / NIS2 programmes.
   - BD/AM teams that work with multiple vendors Y.

4. **What you get in R1.0**
   - Intent Engine and Avatars (System, Org X, Intent Coach).
   - Pipeline: New -> Clarify -> Match -> Commit -> Won / Lost.
   - Minimal Y flow for invited vendors.
   - L1/L2 confidentiality and Mutual NDA integrated in UX.

5. **How we price**
   - Simple per-seat plan for X with volume bands for Intent usage.
   - Free trial / beta for low-volume usage.
   - Free, light accounts for vendors Y responding to Intents.

This skeleton can be turned into a designed PDF / slide deck without changing product assumptions.

---

## 7. Alignment with MVP Product Spec R1.0

- **Domain model**

  - All described flows use only R1.0 entities: Org, User, Intent, Engagement (pre-sales), NDA, Event, TrustScoreSnapshot.
  - No Deliver/Expand containers, Outcome, Issues/Disputes or Hubs are assumed.

- **Scope guardrails**

  - R1.0 pricing and packaging cover:
    - Intent creation and editing,
    - Avatars for clarification and review,
    - pre-sales pipeline for X,
    - minimal Y flow,
    - NDA layers 0/1 and L1/L2 content.
  - Central Org Dashboard, full Y OS, Trust Rooms, ODR and financial layer remain out of scope for R1.0; they are not mentioned as current features in copy.

- **Telemetry and events**

  - Metrics listed here rely only on events already defined in BCOS Data & Event Model v1 (Intent, Avatar, Matching, NDA, Commit, Org/User lifecycle).
  - No new event types are required beyond those already recommended (ORG/USER/ENGAGEMENT events).

- **Commercial decisions vs. implementation**

  - Numeric prices, volume thresholds and contractual constructs are explicitly left to the commercial playbook.
  - Product team must, however, ensure that all counters and events described in section 5 are available so that pricing bands and upgrades can be enforced without refactoring code.

---

## 8. Mapping to issue #7 checklist

Issue #7 scope items and where they are covered:

- **Describe primary use cases for X** - section 2 (UC1-UC4).
- **Define boundary between free/beta and paid usage** - section 3 (Plans A-C).
- **Decide on main pricing dimension (per seat vs per org vs per Intent volume)** - section 4 (per-seat primary, Intent volume as secondary).
- **List product events/metrics for pricing and reporting** - section 5.
- **Draft short copy for website / one-pager** - section 6.
- **Ensure alignment with MVP Product Spec R1.0** - section 7.

From CTO perspective, this document completes the specification side of issue #7. Implementation work in code and GTM assets should treat it as the canonical reference for R1.0 commercial enablement.



