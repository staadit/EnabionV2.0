# Definition of Done & Dev Standards - R1.0

Status: Draft internal - v0  
Release: R1.0 - MVP - "Intent & Pre-Sales OS for X"  
Date: 2025-12-10  
Owner: CTO (Mieszko)  

Related issues: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11  
Scope: cały zespół inżynieryjny (product, dev, AI, QA, ops)  

---

## 1. Cel dokumentu

Celem tego dokumentu jest:

- zdefiniowanie **wspólnej Definition of Done (DoD)** dla R1.0,  
- opisanie **minimalnych standardów inżynieryjnych** (testy, branchowanie, telemetry),  
- powiązanie DoD z **epikami R1.0** (Intent, pipeline, Avatary, NDA, multi-tenant, email integration, TrustScore, telemetry).

Jeśli jakieś zadanie jest oznaczone jako „Done" w GitHub/Project, musi spełniać odpowiednią część tej Definition of Done.

---

## 2. Globalna Definition of Done (dla każdego issue)

Każde issue (feature / technical / doc) w R1.0 może zostać uznane za **Done** tylko jeśli spełnia wszystkie poniższe warunki:

1. **Zakres jest jasny i zrealizowany**  
   - Sekcja *Goal* i *Scope* w issue są uzupełnione.  
   - Zrealizowany kod/konfiguracja odpowiada opisowi zakresu (bez „ukrytych" zmian).

2. **Kod jest zintegrowany i przechodzi testy**  
   - Kod jest zmergowany do głównej gałęzi (`main` / `develop` - zgodnie z sekcją 5).  
   - Lokalne testy dla danego modułu przechodzą.  
   - CI przechodzi bez błędów (testy jednostkowe / integracyjne, linting).

3. **Brak regresji w głównych ścieżkach**  
   - Smoke/e2e dla kluczowych scenariuszy (lista w osobnym dokumencie lub readme modułu) nie zgłasza regresji związanej z daną zmianą.

4. **UI/UX jest co najmniej spójne**  
   - Jeśli zadanie dotyczy UI, wygląd i zachowanie są spójne z Product Spec i istniejącymi ekranami (stylistyka, język, podstawowe stany błędów/ładowania).

5. **Telemetry / eventy są podpięte** (tam gdzie ma to sens)  
   - Dla funkcji user-facing zdefiniowane eventy (np. `INTENT_CREATED`, `AVATAR_SUGGESTION_ISSUED`) są wywoływane.  
   - Jeśli nowa funkcja ma znaczenie biznesowe, istnieje sposób, aby zmierzyć jej użycie.

6. **Bezpieczeństwo i uprawnienia**  
   - Zmiana nie obchodzi istniejącego modelu ról/uprawnień (Owner/Manager/Contributor/Viewer).  
   - Dane są dostępne tylko dla uprawnionych użytkowników danej organizacji (multi-tenant).

7. **Dokumentacja jest zaktualizowana**  
   - Jeśli zmiana dotyczy API, danych, zachowania AI lub UX:  
     - odpowiedni fragment Product Spec / Architecture Overview / AI Gateway / Integrations Playbook jest zaktualizowany lub uzupełniony,  
     - jeśli powstała nowa funkcja - istnieje przynajmniej krótka sekcja w docs (lub link do epika/specy).

8. **Issue ma ustawiony status i linki**  
   - Issue jest przesunięte do kolumny **Done**,  
   - uzupełnione są relacje `blocks` / `is blocked by` (jeśli dotyczy),  
   - w komentarzu odnotowana jest decyzja „accepted" (np. przez CTO/CEO, jeśli wymagane).

---

## 3. Definition of Done per epik R1.0

### 3.1. Intent & Pipeline

Dotyczy funkcji: tworzenie Intentów, lista Intentów, pipeline pre-sales.

DoD (dodatkowo do globalnego):

- Użytkownik X może:
  - utworzyć Intent w trzech trybach (ręcznie, z Intent Coach, z maila/paste) zgodnie z Product Spec,  
  - zobaczyć listę Intentów z podstawowymi filtrami (status, owner, klient),  
  - przeciągać Intenty między kolumnami pipeline (New -> Clarify -> Match -> Commit -> Lost/Won).

- Dla Intentu są logowane eventy:
  - `INTENT_CREATED`, `INTENT_UPDATED`, `INTENT_STATUS_CHANGED`,  
  - eventy są widoczne w logu zdarzeń (backend / telemetry).

- Edge case'y z Product Spec są obsłużone (min.: Intent bez maila, brak odpowiedzi klienta, usunięcie Intentu).

### 3.2. Avatary & AI Gateway

Dotyczy: System Avatar, Org Avatar X (light), Intent Coach.

DoD (dodatkowo):

- Dla każdego Avatara z R1.0 (System, Org X, Intent Coach) mamy:
  - zdefiniowane zadania (input, output, kontekst) w dokumencie `AI_Gateway_Avatars_R1.0.md`,  
  - jasno opisane uprawnienia (co Avatar może zrobić sam, co tylko zasugerować).

- Logujemy eventy `AVATAR_SUGGESTION_ISSUED`, `SUGGESTION_ACCEPTED`, `SUGGESTION_REJECTED`.

- **Kryteria jakości dla Intent Coach / System / Org Avatar X (MVP):**
  - w beta testach (min. 50 Intentów) co najmniej **80%** sugestii Intent Coach jest ocenionych jako „klarowne / pomocne" (thumbs up),  
  - w trybie PL/DE/NL udział oczywistych halucynacji faktów (np. wymyślone nazwy firm/produktów) jest < **5%**,  
  - Avatar ma sensowny fallback typu „I don't know / potrzebuję więcej danych" w sytuacjach niejednoznacznych; to zachowanie jest logowane,  
  - co najmniej 3-5 realnych case'ów z Playbooka (np. przykłady typu BrightCode) zostało przeprowadzonych end-to-end i zaakceptowanych jako „gotowe do klienta po lekkiej edycji".

### 3.3. Trust & NDA (L0/L1, Mutual NDA)

DoD:

- UI jasno pokazuje poziomy poufności **L1/L2/L3**:
  - L1 jako domyślny poziom dla nowych Intentów,  
  - L2 dostępny po akceptacji Mutual NDA,  
  - L3 jako placeholder (bez głębokich funkcji).

- Enabion Mutual NDA (Warstwa 1) jest:
  - dostępny w produkcie (link do pełnego tekstu),  
  - akceptowany przez obie strony z logowaniem zdarzenia `NDA_ACCEPTED`.

- Product copy w UI (tooltips, opisy) odpowiada dokumentowi „Mutual NDA & L0/L1 product copy" - bez sprzeczności.

### 3.4. TrustScore MVP

DoD:

- TrustScore jest widoczny w UI (liczba + etykieta) dla każdej organizacji.  
- Nowa organizacja startuje z wynikiem **50** i etykietą „New / No history yet".  
- Zmiana profilu / zachowania w pipeline powoduje (w rozsądnym czasie) przeliczenie TrustScore (patrz metodologia).  
- Model danych `TrustScoreSnapshot` i eventy `TRUSTSCORE_RECALCULATED` są zgodne z dokumentem metodologicznym.  
- Product Spec jednoznacznie referuje dokument „TrustScore & Trust Graph - Methodology v0" jako źródło zasad.

### 3.5. Email -> Intent Integration

DoD:

- Maile wysłane na `intent@{orgSlug}.enabion.com` tworzą lub aktualizują Intenty zgodnie z „Integrations Playbook - Email -> Intent (MVP)".  
- Poprawnie działają co najmniej scenariusze:
  - nowy mail z klienta CC do aliasu (nowy Intent),
  - forward maila klienta do aliasu (nowy Intent),
  - reply w istniejącym wątku z aliasem (update Intentu).

- Działają podstawowe reguły:
  - detekcji języka,
  - mapowania nagłówków (From/To/Cc/Subject/Body) do pól Intentu,
  - obsługi załączników i limitów.

- Istnieje lista e2e testów (manualnych / automatycznych) pokrywających główne scenariusze i ważniejsze edge case'y.

### 3.6. Auth, organizacje i role (multi-tenant)

DoD:

- Użytkownik może utworzyć organizację X, dodać użytkowników i role (Owner/Manager/Contributor/Viewer).  
- Dane jednej organizacji **nie są widoczne** dla innej (tenancy isolation).  
- Branch/tenant ID jest poprawnie propagowany przez backend i warstwę danych (brak cross-org leaks).  
- Podstawowe scenariusze auth (rejestracja, logowanie, reset hasła) działają i są testowane.

### 3.7. Telemetry & Observability

DoD:

- Kluczowe eventy produktowe są wysyłane do systemu telemetry (np. `INTENT_CREATED`, `INTENT_STATUS_CHANGED`, `AVATAR_SUGGESTION_ISSUED`, `NDA_ACCEPTED`, `TRUSTSCORE_RECALCULATED`).  
- Istnieje minimalny zestaw dashboardów / raportów (nawet w wersji technicznej) pozwalający sprawdzić:
  - ilu mamy aktywnych użytkowników,
  - ile Intentów powstaje,
  - jakie jest obciążenie najważniejszych endpointów.

- Logowanie błędów:
  - błędy 5xx są rejestrowane z kontekstem,  
  - istnieje prosty alert (np. e-mail / Slack) przy przekroczeniu progu błędów.

---

## 4. Minimalne poziomy testów

### 4.1. Podział

- **Unit tests** - logika domenowa, funkcje pomocnicze, AI wrappers.  
- **Integration tests** - interakcje serwisów i warstw (np. BCOS Core + DB, Email Intake + API).  
- **E2E / smoke tests** - główne ścieżki użytkownika (scenariusze z Product Spec).

### 4.2. Minimalne wymagania

Na poziomie R1.0:

- Każdy moduł musi mieć **co najmniej podstawowy zestaw testów jednostkowych** dla krytycznej logiki.  
- Dla głównych funkcji (Intent, pipeline, email integration, TrustScore) wymagane są testy integracyjne.  
- Co najmniej 3-5 scenariuszy e2e:
  - utworzenie Intentu,
  - przejście pipeline'u do Commit,
  - użycie Intent Coach,
  - prosta ścieżka email -> Intent.

Nie narzucamy procentowego coverage, ale docelowo dążymy do **>60%** dla kodu biznesowego w R1.x.

---

## 5. Strategia branchowania i releasów (R1.0)

### 5.1. Przykładowy model

- **`main`** - stabilna gałąź release (R1.0).  
- **`develop`** (opcjonalnie) - integracja zmian przed merge do `main`.  
- **feature branches** - krótkotrwałe gałęzie per issue (`feature/R1-INTENT-001`, `fix/email-intent-edge-cases`, itp.).

### 5.2. Zasady

- Merge do `main` tylko z przechodzącym CI.  
- Feature branch nie powinna żyć dłużej niż kilka dni bez merge/rebase.  
- W razie potrzeby wydzielenia release candidate, używamy tagów (np. `v1.0.0-rc1`).

---

## 6. Przepływ issue na boardzie

Standardowy workflow:

1. **Backlog** - pomysł / zadanie z zarysem Goal/Scope.  
2. **In progress** - zadanie aktywnie w realizacji, ma przypisaną osobę i gałąź.  
3. **For CEO** - zadanie technicznie gotowe, ale wymaga decyzji / odbioru biznesowego (demo, review).  
4. **Done** - zadanie spełnia Global DoD + DoD dla danego epika; CEO/CTO nie zgłaszają blokujących uwag.

Przeniesienie issue do „Done" bez spełnienia powyższych zasad jest traktowane jako błąd procesu.

---

## 7. Podsumowanie

- Ta Definition of Done jest **minimalnym standardem** dla R1.0.  
- Możemy wprowadzać doprecyzowania per moduł, ale nie powinniśmy jej „rozmiękczać".  
- Każdy nowy epik powinien mieć **sekcję DoD** odwołującą się do tego dokumentu, tak aby cały zespół miał wspólny obraz „co to znaczy, że coś jest dowiezione".

