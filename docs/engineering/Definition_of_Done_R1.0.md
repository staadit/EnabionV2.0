# Definition of Done & Dev Standards - R1.0

Status: Draft internal - v0  
Release: R1.0 - MVP - "Intent & Pre-Sales OS for X"  
Date: 2025-12-10  
Owner: CTO (Mieszko)  

Related issues: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11  
Scope: ca?y zesp?? in?ynieryjny (product, dev, AI, QA, ops)  

---

## 1. Cel dokumentu

Celem tego dokumentu jest:

- zdefiniowanie **wsp?lnej Definition of Done (DoD)** dla R1.0,  
- opisanie **minimalnych standard?w in?ynieryjnych** (testy, branchowanie, telemetry),  
- powi?zanie DoD z **epikami R1.0** (Intent, pipeline, Avatary, NDA, multi-tenant, email integration, TrustScore, telemetry).

Je?li jakie? zadanie jest oznaczone jako ?Done" w GitHub/Project, musi spe?nia? odpowiedni? cz??? tej Definition of Done.

---

## 2. Globalna Definition of Done (dla ka?dego issue)

Ka?de issue (feature / technical / doc) w R1.0 mo?e zosta? uznane za **Done** tylko je?li spe?nia wszystkie poni?sze warunki:

1. **Zakres jest jasny i zrealizowany**  
   - Sekcja *Goal* i *Scope* w issue s? uzupe?nione.  
   - Zrealizowany kod/konfiguracja odpowiada opisowi zakresu (bez ?ukrytych" zmian).

2. **Kod jest zintegrowany i przechodzi testy**  
   - Kod jest zmergowany do g??wnej ga??zi (`main` / `develop` - zgodnie z sekcj? 5).  
   - Lokalne testy dla danego modu?u przechodz?.  
   - CI przechodzi bez b??d?w (testy jednostkowe / integracyjne, linting).

3. **Brak regresji w g??wnych ?cie?kach**  
   - Smoke/e2e dla kluczowych scenariuszy (lista w osobnym dokumencie lub readme modu?u) nie zg?asza regresji zwi?zanej z dan? zmian?.

4. **UI/UX jest co najmniej sp?jne**  
   - Je?li zadanie dotyczy UI, wygl?d i zachowanie s? sp?jne z Product Spec i istniej?cymi ekranami (stylistyka, j?zyk, podstawowe stany b??d?w/?adowania).

5. **Telemetry / eventy s? podpi?te** (tam gdzie ma to sens)  
   - Dla funkcji user-facing zdefiniowane eventy (np. `INTENT_CREATED`, `AVATAR_SUGGESTION_ISSUED`) s? wywo?ywane.  
   - Je?li nowa funkcja ma znaczenie biznesowe, istnieje spos?b, aby zmierzy? jej u?ycie.

6. **Bezpiecze?stwo i uprawnienia**  
   - Zmiana nie obchodzi istniej?cego modelu r?l/uprawnie? (Owner/Manager/Contributor/Viewer).  
   - Dane s? dost?pne tylko dla uprawnionych u?ytkownik?w danej organizacji (multi-tenant).

7. **Dokumentacja jest zaktualizowana**  
   - Je?li zmiana dotyczy API, danych, zachowania AI lub UX:  
     - odpowiedni fragment Product Spec / Architecture Overview / AI Gateway / Integrations Playbook jest zaktualizowany lub uzupe?niony,  
     - je?li powsta?a nowa funkcja - istnieje przynajmniej kr?tka sekcja w docs (lub link do epika/specy).

8. **Issue ma ustawiony status i linki**  
   - Issue jest przesuni?te do kolumny **Done**,  
   - uzupe?nione s? relacje `blocks` / `is blocked by` (je?li dotyczy),  
   - w komentarzu odnotowana jest decyzja ?accepted" (np. przez CTO/CEO, je?li wymagane).

---

## 3. Definition of Done per epik R1.0

### 3.1. Intent & Pipeline

Dotyczy funkcji: tworzenie Intent?w, lista Intent?w, pipeline pre-sales.

DoD (dodatkowo do globalnego):

- U?ytkownik X mo?e:
  - utworzy? Intent w trzech trybach (r?cznie, z Intent Coach, z maila/paste) zgodnie z Product Spec,  
  - zobaczy? list? Intent?w z podstawowymi filtrami (status, owner, klient),  
  - przeci?ga? Intenty mi?dzy kolumnami pipeline (New -> Clarify -> Match -> Commit -> Lost/Won).

- Dla Intentu s? logowane eventy:
  - `INTENT_CREATED`, `INTENT_UPDATED`, `INTENT_STATUS_CHANGED`,  
  - eventy s? widoczne w logu zdarze? (backend / telemetry).

- Edge case'y z Product Spec s? obs?u?one (min.: Intent bez maila, brak odpowiedzi klienta, usuni?cie Intentu).

### 3.2. Avatary & AI Gateway

Dotyczy: System Avatar, Org Avatar X (light), Intent Coach.

DoD (dodatkowo):

- Dla ka?dego Avatara z R1.0 (System, Org X, Intent Coach) mamy:
  - zdefiniowane zadania (input, output, kontekst) w dokumencie `AI_Gateway_Avatars_R1.0.md`,  
  - jasno opisane uprawnienia (co Avatar mo?e zrobi? sam, co tylko zasugerowa?).

- Logujemy eventy `AVATAR_SUGGESTION_ISSUED`, `SUGGESTION_ACCEPTED`, `SUGGESTION_REJECTED`.

- **Kryteria jako?ci dla Intent Coach / System / Org Avatar X (MVP):**
  - w beta testach (min. 50 Intent?w) co najmniej **80%** sugestii Intent Coach jest ocenionych jako ?klarowne / pomocne" (thumbs up),  
  - w trybie PL/DE/NL udzia? oczywistych halucynacji fakt?w (np. wymy?lone nazwy firm/produkt?w) jest < **5%**,  
  - Avatar ma sensowny fallback typu ?I don't know / potrzebuj? wi?cej danych" w sytuacjach niejednoznacznych; to zachowanie jest logowane,  
  - co najmniej 3-5 realnych case'?w z Playbooka (np. przyk?ady typu BrightCode) zosta?o przeprowadzonych end-to-end i zaakceptowanych jako ?gotowe do klienta po lekkiej edycji".

### 3.3. Trust & NDA (L0/L1, Mutual NDA)

DoD:

- UI jasno pokazuje poziomy poufno?ci **L1/L2/L3**:
  - L1 jako domy?lny poziom dla nowych Intent?w,  
  - L2 dost?pny po akceptacji Mutual NDA,  
  - L3 jako placeholder (bez g??bokich funkcji).

- Enabion Mutual NDA (Warstwa 1) jest:
  - dost?pny w produkcie (link do pe?nego tekstu),  
  - akceptowany przez obie strony z logowaniem zdarzenia `NDA_ACCEPTED`.

- Product copy w UI (tooltips, opisy) odpowiada dokumentowi ?Mutual NDA & L0/L1 product copy" - bez sprzeczno?ci.

### 3.4. TrustScore MVP

DoD:

- TrustScore jest widoczny w UI (liczba + etykieta) dla ka?dej organizacji.  
- Nowa organizacja startuje z wynikiem **50** i etykiet? ?New / No history yet".  
- Zmiana profilu / zachowania w pipeline powoduje (w rozs?dnym czasie) przeliczenie TrustScore (patrz metodologia).  
- Model danych `TrustScoreSnapshot` i eventy `TRUSTSCORE_RECALCULATED` s? zgodne z dokumentem metodologicznym.  
- Product Spec jednoznacznie referuje dokument ?TrustScore & Trust Graph - Methodology v0" jako ?r?d?o zasad.

### 3.5. Email -> Intent Integration

DoD:

- Maile wys?ane na `intent@{orgSlug}.enabion.com` tworz? lub aktualizuj? Intenty zgodnie z ?Integrations Playbook - Email -> Intent (MVP)".  
- Poprawnie dzia?aj? co najmniej scenariusze:
  - nowy mail z klienta CC do aliasu (nowy Intent),
  - forward maila klienta do aliasu (nowy Intent),
  - reply w istniej?cym w?tku z aliasem (update Intentu).

- Dzia?aj? podstawowe regu?y:
  - detekcji j?zyka,
  - mapowania nag??wk?w (From/To/Cc/Subject/Body) do p?l Intentu,
  - obs?ugi za??cznik?w i limit?w.

- Istnieje lista e2e test?w (manualnych / automatycznych) pokrywaj?cych g??wne scenariusze i wa?niejsze edge case'y.

### 3.6. Auth, organizacje i role (multi-tenant)

DoD:

- U?ytkownik mo?e utworzy? organizacj? X, doda? u?ytkownik?w i role (Owner/Manager/Contributor/Viewer).  
- Dane jednej organizacji **nie s? widoczne** dla innej (tenancy isolation).  
- Branch/tenant ID jest poprawnie propagowany przez backend i warstw? danych (brak cross-org leaks).  
- Podstawowe scenariusze auth (rejestracja, logowanie, reset has?a) dzia?aj? i s? testowane.

### 3.7. Telemetry & Observability

DoD:

- Kluczowe eventy produktowe s? wysy?ane do systemu telemetry (np. `INTENT_CREATED`, `INTENT_STATUS_CHANGED`, `AVATAR_SUGGESTION_ISSUED`, `NDA_ACCEPTED`, `TRUSTSCORE_RECALCULATED`).  
- Istnieje minimalny zestaw dashboard?w / raport?w (nawet w wersji technicznej) pozwalaj?cy sprawdzi?:
  - ilu mamy aktywnych u?ytkownik?w,
  - ile Intent?w powstaje,
  - jakie jest obci??enie najwa?niejszych endpoint?w.

- Logowanie b??d?w:
  - b??dy 5xx s? rejestrowane z kontekstem,  
  - istnieje prosty alert (np. e-mail / Slack) przy przekroczeniu progu b??d?w.

---

## 4. Minimalne poziomy test?w

### 4.1. Podzia?

- **Unit tests** - logika domenowa, funkcje pomocnicze, AI wrappers.  
- **Integration tests** - interakcje serwis?w i warstw (np. BCOS Core + DB, Email Intake + API).  
- **E2E / smoke tests** - g??wne ?cie?ki u?ytkownika (scenariusze z Product Spec).

### 4.2. Minimalne wymagania

Na poziomie R1.0:

- Ka?dy modu? musi mie? **co najmniej podstawowy zestaw test?w jednostkowych** dla krytycznej logiki.  
- Dla g??wnych funkcji (Intent, pipeline, email integration, TrustScore) wymagane s? testy integracyjne.  
- Co najmniej 3-5 scenariuszy e2e:
  - utworzenie Intentu,
  - przej?cie pipeline'u do Commit,
  - u?ycie Intent Coach,
  - prosta ?cie?ka email -> Intent.

Nie narzucamy procentowego coverage, ale docelowo d??ymy do **>60%** dla kodu biznesowego w R1.x.

---

## 5. Strategia branchowania i releas?w (R1.0)

### 5.1. Przyk?adowy model

- **`main`** - stabilna ga??? release (R1.0).  
- **`develop`** (opcjonalnie) - integracja zmian przed merge do `main`.  
- **feature branches** - kr?tkotrwa?e ga??zie per issue (`feature/R1-INTENT-001`, `fix/email-intent-edge-cases`, itp.).

### 5.2. Zasady

- Merge do `main` tylko z przechodz?cym CI.  
- Feature branch nie powinna ?y? d?u?ej ni? kilka dni bez merge/rebase.  
- W razie potrzeby wydzielenia release candidate, u?ywamy tag?w (np. `v1.0.0-rc1`).

---

## 6. Przep?yw issue na boardzie

Standardowy workflow:

1. **Backlog** - pomys? / zadanie z zarysem Goal/Scope.  
2. **In progress** - zadanie aktywnie w realizacji, ma przypisan? osob? i ga???.  
3. **For CEO** - zadanie technicznie gotowe, ale wymaga decyzji / odbioru biznesowego (demo, review).  
4. **Done** - zadanie spe?nia Global DoD + DoD dla danego epika; CEO/CTO nie zg?aszaj? blokuj?cych uwag.

Przeniesienie issue do ?Done" bez spe?nienia powy?szych zasad jest traktowane jako b??d procesu.

---

## 7. AI-generated code – testing baseline (R1.0)
- Minimalne testy dla kodu generowanego/assistowanego przez AI:
  - unit: ?cie?ki logiczne, walidacja wej??/wyj??, null/edge cases,
  - integration: wywo?ania API/SDK z mockami (bez trafiania w zewn?trzne us?ugi),
  - e2e (UI): happy path + jeden scenariusz negatywny,
  - logowanie zdarze? (AVATAR_SUGGESTION_* / audit) + brak PII w logach.
- W PR z kodem AI dodaj checkbox: ?AI code reviewed + tests ran?.

## 8. Spec update vs. komentarz w issue
- Aktualizuj plik spec (Product/Architecture/Data/AI/Security/NDA) gdy zmienia si?:
  - zakres/kontrakt/terminologia,
  - decyzje architektoniczne,
  - modele danych/eventy,
  - role/bezpiecze?stwo/NDA.
- Komentarz w issue wystarczy dla priorytetyzacji lub drobnych TODO.
- Zmiany w DoD/testach zapisuj w tym pliku; w komentarzu tylko link do commita.

## 9. Epic template dla AI breakdown
- Ka?dy epik powinien mie? jasne sekcje: Goal, Scope (in/out), Constraints/Non-goals, Acceptance Criteria, Dependencies/Relations, Test expectations, Telemetry/Events, Tasks jako checklist.
- Tasks musz? by? zapisane jako checklisty `[ ]` / `[x]` (??atwe do auto-breakdown).
- Wymagania:
  - j?zyk angielski, jednoznaczne nazwy encji/event?w,
  - relacje (is blocked by) ustawione,
  - link do w?a?ciwego speca (Product/Data/AI/Security),
  - brak znak?w mojibake.

---

## 10. Podsumowanie

- Ta Definition of Done jest **minimalnym standardem** dla R1.0.  
- Mo?emy wprowadza? doprecyzowania per modu?, ale nie powinni?my jej ?rozmi?kcza?".  
- Ka?dy nowy epik powinien mie? **sekcj? DoD** odwo?uj?c? si? do tego dokumentu, tak aby ca?y zesp?? mia? wsp?lny obraz ?co to znaczy, ?e co? jest dowiezione".
