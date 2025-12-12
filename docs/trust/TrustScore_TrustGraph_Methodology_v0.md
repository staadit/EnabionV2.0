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

- jak dzia?a **TrustScore MVP** w R1.0 (jakie sygna?y, jak liczone, co widzi u?ytkownik),  
- jakie przyjmujemy **zasady fair-play** (neutralny start, brak kary za brak historii, podstawowe anti-gaming),  
- jak TrustScore MVP **ewoluuje** do pe?nego **Enabion Trust Graph?** w R3.0.

Dokument jest ?kontraktem" mi?dzy produktem, dev/AI teamem a komunikacj? do klient?w.

---

## 2. Skala i semantyka TrustScore

### 2.1. Skala liczbowa

- Zakres: **0-100**.  
- Warto?? startowa dla nowej organizacji: **50** - status: **?New / No history yet"**.  
- W R1.0 nie ma mo?liwo?ci r?cznego nadania wy?szego lub ni?szego TrustScore bez event?w w systemie.

### 2.2. Co oznaczaj? poziomy (R1.0)

W R1.0 stosujemy prosty podzia?:

- **0-39** - ?Low trust / problematic history" - zarezerwowane na przysz?o?? (R3.0) z pe?nymi danymi o dostawach i sporach. W R1.0 praktycznie nieu?ywane.  
- **40-59** - ?Neutral / standard" - typowy zakres dla organizacji z ma?? ilo?ci? danych.  
- **60-79** - ?Good behaviour" - aktywne, responsywne organizacje o dobrze uzupe?nionych profilach.  
- **80-100** - ?Excellent / strong reputation" - zarezerwowane g??wnie na przysz?o??, gdy b?dziemy mieli dane o historii projekt?w.

> W praktyce R1.0 b?dzie operowa? g??wnie w przedziale 45-70. Dolne i g?rne skraje skali s? zostawione na przysz?o?? (po do?o?eniu Deliver/ODR).

---

## 3. Sygna?y TrustScore w R1.0 (MVP)

W R1.0 TrustScore opiera si? wy??cznie na **behawioralnych sygna?ach pre-sales** i jako?ci profilu organizacji. Nie korzystamy jeszcze z historii realizacji projekt?w ani spor?w.

### 3.1. Zestaw sygna??w MVP

1. **ProfileCompleteness** - jak kompletne s? profile:
   - profil organizacji (dane kontaktowe, rynki, technologie, rozmiar, opis),
   - profile u?ytkownik?w kluczowych (BD/AM, PM, CEO).
2. **ResponsivenessToIntents** - jak szybko organizacja reaguje na Intenty:
   - czas od utworzenia Intentu do pierwszej reakcji (np. aktualizacja statusu, komentarz, odpowied? do klienta),
   - szczeg?lnie dla Intent?w, gdzie organizacja jest stron? X (lead owner) lub Y (zaproszony partner).
3. **BehaviourInPipeline** - zachowania w pipeline:
   - czy Intenty przechodz? przez etapy (Clarify/Match/Commit), czy pozostaj? ?wisz?ce",
   - czy status Intentu jest aktualizowany (np. ?Lost", ?Won"), a nie porzucany bez decyzji.

### 3.2. Wagi i wp?yw sygna??w (heurystyka v0)

Przyjmujemy prosty model addytywny:

```text
TrustScore = clamp(50 + ?Profile + ?Response + ?Behaviour, 0, 100)
```

- `?Profile` - od ?5 do +10 punkt?w,  
- `?Response` - od ?10 do +10 punkt?w,  
- `?Behaviour` - od ?5 do +5 punkt?w.

#### 3.2.1. ProfileCompleteness

- Obliczamy procentow? kompletno?? profilu organizacji (0-100%).  
- Heurystyka v0:

  - < 40% - `?Profile = ?5`  
  - 40-60% - `?Profile = 0`  
  - 60-80% - `?Profile = +5`  
  - > 80% - `?Profile = +10`  

#### 3.2.2. ResponsivenessToIntents

- Obliczamy median? czasu do pierwszej reakcji dla N ostatnich Intent?w (np. N = 10).  
- Heurystyka v0:

  - ? 4h - `?Response = +10`  
  - 4-24h - `?Response = +5`  
  - 24-72h - `?Response = 0`  
  - 72-168h (3-7 dni) - `?Response = ?5`  
  - > 168h - `?Response = ?10`  

W R1.0 czas liczymy w godzinach kalendarzowych; w przysz?o?ci mo?na przej?? na ?business hours" per strefa czasowa.

#### 3.2.3. BehaviourInPipeline

Sygna?y pozytywne:

- Intent ma nadany ownera (BD/AM) w rozs?dnym czasie,  
- status Intentu jest aktualizowany (np. ?Lost", ?Won"),  
- Intenty nie wisz? miesi?cami bez decyzji.

Heurystyka v0 (dla N ostatnich Intent?w):

- > 80% Intent?w z nadanym ownerem i finalnym statusem - `?Behaviour = +5`  
- 50-80% - `?Behaviour = 0`  
- < 50% - `?Behaviour = ?5`  

---

## 4. Zasady fair-play i anti-gaming (R1.0)

### 4.1. Neutralny start

- Nowa organizacja zaczyna zawsze z **TrustScore = 50** i etykiet? **?New / No history yet"**.  
- Brak historii **nie obni?a** wyniku poni?ej 50.  
- Dzi?ki temu m?ode firmy/startupy nie s? karane za to, ?e dopiero rozpoczynaj? prac? w Enabion.

### 4.2. Brak ?magic shortcuts"

- Nie ma przycisk?w typu ?podnie? mi TrustScore" - wynik jest pochodn? event?w i zachowa?.  
- Edycje profilu, update'y Intent?w itp. musz? przej?? przez normalne operacje w systemie.

### 4.3. Podstawowe regu?y anti-gaming

- Zbyt cz?ste ?sztuczne" update'y (np. zmiana statusu Intentu bez realnej zmiany) mog? by? **ignorowane** przy liczeniu statystyk (np. deduplikacja w czasie).  
- Anomalie (np. nienaturalnie cz?ste Intenty tworzone i natychmiast zamykane) powinny by? oznaczane jako ?do przegl?du" w logach analitycznych, ale w R1.0 nie wp?ywaj? jeszcze na TrustScore ujemnie.  
- W przysz?o?ci (R3.0) przewidujemy bardziej zaawansowane regu?y anty-gamingowe bazuj?ce na Trust Graph.

### 4.4. Prawo do zakwestionowania (future)

- W R1.0 nie ma jeszcze formalnego workflow ?odwo?ania" TrustScore.  
- Docelowo (R3.0) chcemy doda? mo?liwo??:
  - zg?oszenia zastrze?enia do zdarzenia (np. sporu),
  - w??czenia Hubs / EnableMark Foundation w proces przegl?du.

---

## 5. Co widzi u?ytkownik w R1.0

### 5.1. Warstwa UI

Dla ka?dej organizacji (X, Y, Z) w UI pokazujemy:

- **TrustScore (0-100)**, zaokr?glony do pe?nych punkt?w,  
- kr?tk? **etykiet?** (np. ?New / No history yet", ?Good behaviour"),  
- **kr?tkie wyja?nienie** (2-3 bullet points) typu:

  - ?Profile 80% complete"  
  - ?Median response time: 12h"  
  - ?Most Intents have an owner and a final status."

### 5.2. Co jest wewn?trzne (R1.0)

- Szczeg??y heurystyk (`?Profile`, `?Response`, `?Behaviour`) s? opisane w tym dokumencie i mog? by? dalej doprecyzowywane, ale nie musz? by? 1:1 eksponowane w UI.  
- Sygnatury anty-gamingowe i flagi anomalii pozostaj? wewn?trzne (telemetria, analityka).

---

## 6. Powi?zanie z Data & Event Model v1

### 6.1. Encje i eventy

- Encja **`TrustScoreSnapshot`** (lub r?wnowa?na) przechowuje:
  - `org_id`,  
  - `score`,  
  - komponenty (`delta_profile`, `delta_response`, `delta_behaviour`),  
  - `calculated_at` (timestamp).

- G??wny event: **`TRUSTSCORE_RECALCULATED`**:
  - powstaje po istotnym zdarzeniu (np. update profilu, nowy Intent, zmiana statusu Intentu),  
  - zawiera referencje do event?w ?r?d?owych (np. `INTENT_CREATED`, `INTENT_STATUS_CHANGED`).

### 6.2. Kiedy przeliczamy TrustScore

- **On change** - po:
  - utworzeniu Intentu,  
  - zmianie statusu Intentu,  
  - zmianie ownera,  
  - istotnej aktualizacji profilu org lub u?ytkownika.  
- **Batch** (np. raz dziennie) - aby wyg?adzi? skoki i mie? sp?jne raporty.

Mechanizm batch vs on change mo?e by? w R1.0 zrealizowany jako prosty job cronowy, kt?ry przelicza TrustScore ?na ??danie" (po wykryciu flagi ?dirty").

---

## 7. Roadmapa do Trust Graph 1.0 (R3.0)

### 7.1. Nowe wymiary TrustScore

W R3.0 TrustScore b?dzie oparty na trzech g??wnych faktorach:

1. **DeliveryFactor** - jak projekty s? dowo?one (terminowo??, jako??, spe?nienie KPI).  
2. **RiskFactor** - historia spor?w (Issues/Disputes), eskalacji, ODR.  
3. **BehaviourFactor** - to, co mamy ju? w R1.0 (responsywno??, kompletno??, transparentno??).

TrustScore stanie si? wypadkow? tych trzech sk?adowych z jasno opisanymi wagami.

### 7.2. Trust Graph - w?z?y i kraw?dzie

- **W?z?y**:
  - organizacje (X, Y, Z),
  - osoby (PM, BD, CEO),
  - projekty (Engagement / BCOS Container),
  - Hubs, Programy, EnableMark.  
- **Kraw?dzie**:
  - wykonane projekty X?Y?Z,
  - wsp?lne programy i Hubs,
  - relacje wynikaj?ce ze spor?w i ich rozwi?za?.

Trust Graph pozwoli na:

- trust-aware matching partner?w,  
- mapy ryzyka w danym sektorze/regionie,  
- rozpoznawanie pozytywnej i negatywnej reputacji w spos?b audytowalny.

### 7.3. Ewolucja z R1.0 do R3.0

- R1.0 - tylko sygna?y pre-sales (profile, responsywno??, pipeline).  
- R2.0 - pojawiaj? si? Deliver i podstawowe Issues/Disputes -> zaczynamy zbiera? dane pod DeliveryFactor i RiskFactor.  
- R3.0 - pe?ny Trust Graph, ODR v1, Hubs i EnableMark wp?ywaj?ce na TrustScore.

---

## 8. Komunikacja do klient?w (wersja skr?cona)

Propozycja narracji biznesowej (do u?ycia w materia?ach / rozmowach):

> ?TrustScore w Enabion nie jest tajemniczym algorytmem. Na start ka?da firma ma neutralny wynik (50 - ?New / No history yet"). W R1.0 wynik opiera si? wy??cznie na tym, jak organizacja pracuje z Intentami: czy ma uzupe?niony profil, jak szybko odpowiada na zapytania i czy doprowadza sprawy do ko?ca. W kolejnych release'ach (R3.0) TrustScore b?dzie uwzgl?dnia? r?wnie? histori? dowiezienia projekt?w oraz spos?b rozwi?zywania spor?w - wszystko oparte o przejrzyste, audytowalne zdarzenia."

To whitepaper mo?na linkowa? z Product Spec, materia??w sprzeda?owych oraz rozm?w z partnerami.

