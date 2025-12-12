# TrustScore & Trust Graph - Methodology v0

Status: Draft internal - v0  
Release focus: R1.0 (TrustScore MVP) + high-level roadmap to R3.0 (Trust Graph)  
Date: 2025-12-10  
Owner: CTO (Mieszko)  

Related issues: #1, #2, #5, #9, #10, #11  
Related docs:  
- `docs/Phase1_MVP-Spec.md` - sekcja TrustScore MVP  
- `docs/Phase1_Architecture_Overview_R1.0_MVP.md` - Trust & scoring  
- `docs/whitepapers/Data_Models_1-3_Business_Whitepaper_v0.md`  
- `docs/engineering/Definition_of_Done_R1.0.md`  

---

## 1. Cel dokumentu

Ten dokument definiuje:

- jak działa **TrustScore MVP** w R1.0 (jakie sygnały, jak liczone, co widzi użytkownik),  
- jakie przyjmujemy **zasady fair-play** (neutralny start, brak kary za brak historii, podstawowe anti-gaming),  
- jak TrustScore MVP **ewoluuje** do pełnego **Enabion Trust Graph™** w R3.0.

Dokument jest „kontraktem" między produktem, dev/AI teamem a komunikacją do klientów.

---

## 2. Skala i semantyka TrustScore

### 2.1. Skala liczbowa

- Zakres: **0-100**.  
- Wartość startowa dla nowej organizacji: **50** - status: **„New / No history yet"**.  
- W R1.0 nie ma możliwości ręcznego nadania wyższego lub niższego TrustScore bez eventów w systemie.

### 2.2. Co oznaczają poziomy? (R1.0)

W R1.0 stosujemy prosty podział:

- **0-39** - „Low trust / problematic history" - zarezerwowane na przyszłość (R3.0) z pełnymi danymi o dostawach i sporach. W R1.0 praktycznie nieużywane.  
- **40-59** - „Neutral / standard" - typowy zakres dla organizacji z małą ilością danych.  
- **60-79** - „Good behaviour" - aktywne, responsywne organizacje o dobrze uzupełnionych profilach.  
- **80-100** - „Excellent / strong reputation" - zarezerwowane głównie na przyszłość, gdy będziemy mieli dane o historii projektów.

> W praktyce R1.0 będzie operował głównie w przedziale 45-70. Dolne i górne skraje skali są zostawione na przyszłość (po dołożeniu Deliver/ODR).

---

## 3. Sygnały TrustScore w R1.0 (MVP)

W R1.0 TrustScore opiera się wyłącznie na **behawioralnych sygnałach pre-sales** i jakości profilu organizacji. Nie korzystamy jeszcze z historii realizacji projektów ani sporów.

### 3.1. Zestaw sygnałów MVP

1. **ProfileCompleteness** - jak kompletne są profile:
   - profil organizacji (dane kontaktowe, rynki, technologie, rozmiar, opis),
   - profile użytkowników kluczowych (BD/AM, PM, CEO).
2. **ResponsivenessToIntents** - jak szybko organizacja reaguje na Intenty:
   - czas od utworzenia Intentu do pierwszej reakcji (np. aktualizacja statusu, komentarz, odpowiedź do klienta),
   - szczególnie dla Intentów, gdzie organizacja jest stroną X (lead owner) lub Y (zaproszony partner).
3. **BehaviourInPipeline** - zachowania w pipeline:
   - czy Intenty przechodzą przez etapy (Clarify/Match/Commit), czy pozostają „wiszące",
   - czy status Intentu jest aktualizowany (np. „Lost", „Won"), a nie porzucany bez decyzji.

### 3.2. Wagi i wpływ sygnałów (heurystyka v0)

Przyjmujemy prosty model addytywny:

```text
TrustScore = clamp(50 + ΔProfile + ΔResponse + ΔBehaviour, 0, 100)
```

- `ΔProfile` - od −5 do +10 punktów,  
- `ΔResponse` - od −10 do +10 punktów,  
- `ΔBehaviour` - od −5 do +5 punktów.

#### 3.2.1. ProfileCompleteness

- Obliczamy procentową kompletność profilu organizacji (0-100%).  
- Heurystyka v0:

  - < 40% - `ΔProfile = −5`  
  - 40-60% - `ΔProfile = 0`  
  - 60-80% - `ΔProfile = +5`  
  - > 80% - `ΔProfile = +10`  

#### 3.2.2. ResponsivenessToIntents

- Obliczamy medianę czasu do pierwszej reakcji dla N ostatnich Intentów (np. N = 10).  
- Heurystyka v0:

  - ≤ 4h - `ΔResponse = +10`  
  - 4-24h - `ΔResponse = +5`  
  - 24-72h - `ΔResponse = 0`  
  - 72-168h (3-7 dni) - `ΔResponse = −5`  
  - > 168h - `ΔResponse = −10`  

W R1.0 czas liczymy w godzinach kalendarzowych; w przyszłości można przejść na „business hours" per strefa czasowa.

#### 3.2.3. BehaviourInPipeline

Sygnały pozytywne:

- Intent ma nadany ownera (BD/AM) w rozsądnym czasie,  
- status Intentu jest aktualizowany (np. „Lost", „Won"),  
- Intenty nie wiszą miesiącami bez decyzji.

Heurystyka v0 (dla N ostatnich Intentów):

- > 80% Intentów z nadanym ownerem i finalnym statusem - `ΔBehaviour = +5`  
- 50-80% - `ΔBehaviour = 0`  
- < 50% - `ΔBehaviour = −5`  

---

## 4. Zasady fair-play i anti-gaming (R1.0)

### 4.1. Neutralny start

- Nowa organizacja zaczyna zawsze z **TrustScore = 50** i etykietą **„New / No history yet"**.  
- Brak historii **nie obniża** wyniku poniżej 50.  
- Dzięki temu młode firmy/startupy nie są karane za to, że dopiero rozpoczynają pracę w Enabion.

### 4.2. Brak „magic shortcuts"

- Nie ma przycisków typu „podnieś mi TrustScore" - wynik jest pochodną eventów i zachowań.  
- Edycje profilu, update'y Intentów itp. muszą przejść przez normalne operacje w systemie.

### 4.3. Podstawowe reguły anti-gaming

- Zbyt częste „sztuczne" update'y (np. zmiana statusu Intentu bez realnej zmiany) mogą być **ignorowane** przy liczeniu statystyk (np. deduplikacja w czasie).  
- Anomalie (np. nienaturalnie częste Intenty tworzone i natychmiast zamykane) powinny być oznaczane jako „do przeglądu" w logach analitycznych, ale w R1.0 nie wpływają jeszcze na TrustScore ujemnie.  
- W przyszłości (R3.0) przewidujemy bardziej zaawansowane reguły anty-gamingowe bazujące na Trust Graph.

### 4.4. Prawo do zakwestionowania (future)

- W R1.0 nie ma jeszcze formalnego workflow „odwołania" TrustScore.  
- Docelowo (R3.0) chcemy dodać możliwość:
  - zgłoszenia zastrzeżenia do zdarzenia (np. sporu),
  - włączenia Hubs / EnableMark Foundation w proces przeglądu.

---

## 5. Co widzi użytkownik w R1.0?

### 5.1. Warstwa UI

Dla każdej organizacji (X, Y, Z) w UI pokazujemy:

- **TrustScore (0-100)**, zaokrąglony do pełnych punktów,  
- krótką **etykietę** (np. „New / No history yet", „Good behaviour"),  
- **krótkie wyjaśnienie** (2-3 bullet points) typu:

  - „Profile 80% complete"  
  - „Median response time: 12h"  
  - „Most Intents have an owner and a final status."

### 5.2. Co jest wewnętrzne (R1.0)?

- Szczegóły heurystyk (`ΔProfile`, `ΔResponse`, `ΔBehaviour`) są opisane w tym dokumencie i mogą być dalej doprecyzowywane, ale nie muszą być 1:1 eksponowane w UI.  
- Sygnatury anty-gamingowe i flagi anomalii pozostają wewnętrzne (telemetria, analityka).

---

## 6. Powiązanie z Data & Event Model v1

### 6.1. Encje i eventy

- Encja **`TrustScoreSnapshot`** (lub równoważna) przechowuje:
  - `org_id`,  
  - `score`,  
  - komponenty (`delta_profile`, `delta_response`, `delta_behaviour`),  
  - `calculated_at` (timestamp).

- Główny event: **`TRUSTSCORE_RECALCULATED`**:
  - powstaje po istotnym zdarzeniu (np. update profilu, nowy Intent, zmiana statusu Intentu),  
  - zawiera referencje do eventów źródłowych (np. `INTENT_CREATED`, `INTENT_STATUS_CHANGED`).

### 6.2. Kiedy przeliczamy TrustScore?

- **On change** - po:
  - utworzeniu Intentu,  
  - zmianie statusu Intentu,  
  - zmianie ownera,  
  - istotnej aktualizacji profilu org lub użytkownika.  
- **Batch** (np. raz dziennie) - aby wygładzić skoki i mieć spójne raporty.

Mechanizm batch vs on change może być w R1.0 zrealizowany jako prosty job cronowy, który przelicza TrustScore „na żądanie" (po wykryciu flagi „dirty").

---

## 7. Roadmapa do Trust Graph 1.0 (R3.0)

### 7.1. Nowe wymiary TrustScore

W R3.0 TrustScore będzie oparty na trzech głównych faktorach:

1. **DeliveryFactor** - jak projekty są dowożone (terminowość, jakość, spełnienie KPI).  
2. **RiskFactor** - historia sporów (Issues/Disputes), eskalacji, ODR.  
3. **BehaviourFactor** - to, co mamy już w R1.0 (responsywność, kompletność, transparentność).

TrustScore stanie się wypadkową tych trzech składowych z jasno opisanymi wagami.

### 7.2. Trust Graph - węzły i krawędzie

- **Węzły**:
  - organizacje (X, Y, Z),
  - osoby (PM, BD, CEO),
  - projekty (Engagement / BCOS Container),
  - Hubs, Programy, EnableMark.  
- **Krawędzie**:
  - wykonane projekty X↔Y↔Z,
  - wspólne programy i Hubs,
  - relacje wynikające ze sporów i ich rozwiązań.

Trust Graph pozwoli na:

- trust-aware matching partnerów,  
- mapy ryzyka w danym sektorze/regionie,  
- rozpoznawanie pozytywnej i negatywnej reputacji w sposób audytowalny.

### 7.3. Ewolucja z R1.0 do R3.0

- R1.0 - tylko sygnały pre-sales (profile, responsywność, pipeline).  
- R2.0 - pojawiają się Deliver i podstawowe Issues/Disputes -> zaczynamy zbierać dane pod DeliveryFactor i RiskFactor.  
- R3.0 - pełny Trust Graph, ODR v1, Hubs i EnableMark wpływające na TrustScore.

---

## 8. Komunikacja do klientów (wersja skrócona)

Propozycja narracji biznesowej (do użycia w materiałach / rozmowach):

> „TrustScore w Enabion nie jest tajemniczym algorytmem. Na start każda firma ma neutralny wynik (50 - „New / No history yet"). W R1.0 wynik opiera się wyłącznie na tym, jak organizacja pracuje z Intentami: czy ma uzupełniony profil, jak szybko odpowiada na zapytania i czy doprowadza sprawy do końca. W kolejnych release'ach (R3.0) TrustScore będzie uwzględniał również historię dowiezienia projektów oraz sposób rozwiązywania sporów - wszystko oparte o przejrzyste, audytowalne zdarzenia."

To whitepaper można linkować z Product Spec, materiałów sprzedażowych oraz rozmów z partnerami.

