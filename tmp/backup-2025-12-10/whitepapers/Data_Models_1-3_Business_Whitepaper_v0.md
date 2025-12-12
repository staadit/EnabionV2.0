# Data Models 1-3 - Business Whitepaper (v0)

Status: Draft internal - v0  
Release focus: R1.0 (Model 1 only; Models 2-3 as roadmap)  
Date: 2025-12-10  
Audience: CEO, CTO/CIO, CISO, legal, sales / partner teams  

---

## 1. Dlaczego w ogóle modele danych?

Enabion ma działać w bardzo różnych środowiskach:

- od małych i średnich firm technologicznych (software houses, agencje, konsulting),  
- przez korporacje z działami zakupów i compliance,  
- aż po sektor regulowany (banki, gov, defence).

Te organizacje mają **różne wymagania dotyczące tego, gdzie przechowywane są dane, kto ma do nich dostęp i jak może działać AI**. Zamiast jednego „sztywnego" modelu, Enabion używa **trzech poziomów modelu danych**:

1. **Model 1 - Standard** - szybki start w chmurze Enabion (multi-tenant SaaS).  
2. **Model 2 - Shielded** - wrażliwe dane pozostają „za tarczą" w infrastrukturze klienta.  
3. **Model 3 - Sovereign** - pełna suwerenność: dedykowana instancja, BYOK, data residency.

Wersja R1.0 dostarcza w pełni **Model 1 - Standard**. Modele 2-3 są opisane tutaj jako **jasna ścieżka rozwoju** i punkt wyjścia do rozmów z klientami enterprise.

---

## 2. Model 1 - Standard (SaaS)

### 2.1. W jednym zdaniu

> Model 1 - Standard to **multi-tenantowa chmura Enabion**, w której dane projektów (L1 + część L2) są przechowywane i przetwarzane w infrastrukturze Enabion, z domyślnymi standardami bezpieczeństwa i audytu.

### 2.2. Dla kogo jest Model 1?

- Firmy X (software houses, agencje, konsulting) 5-500 osób.  
- Klienci, którzy korzystają już dziś z SaaS (np. Jira, HubSpot, Slack) i akceptują model multi-tenant.  
- Organizacje, dla których głównym problemem jest **chaos wokół Intentów i pre-sales**, a nie ekstremalne wymagania regulacyjne.

### 2.3. Gdzie są dane?

W Modelu 1:

- Dane **L1** (treści „konferencyjne") i wybrane dane **L2** są przechowywane w chmurze Enabion.  
- Baza danych, event log i logi AI mieszkają w regionach chmurowych zarządzanych przez Enabion (np. EU-hosted).  
- Enabion odpowiada za:
  - backupy,
  - logi audytowe,
  - podstawowe mechanizmy bezpieczeństwa (szyfrowanie w spoczynku i w tranzycie, kontrola dostępu).

### 2.4. Jak działa AI w Modelu 1?

- Avatary (System, Org Avatar X, Intent Coach) korzystają z danych przechowywanych w Enabion:  
  - treści Intentów,
  - metadanych projektów,
  - historii interakcji (event log).
- Dane mogą być przekazywane do modeli AI (foundation models, fine-tuned) zgodnie z polityką Enabion i obowiązującymi regulacjami - z naciskiem na EU-kompatybilność.

### 2.5. Typowe use case'y

- Firma X otrzymuje maile od klientów i zamienia je w Intenty (Clarify -> Match -> Commit).  
- Cały pipeline pre-sales (i podstawowe metryki) działa w Enabion bez konieczności stawiania własnej infrastruktury.  
- Klientowi wystarcza standardowy DPA i opis Modelu 1 - nie potrzebuje własnego on-prem ani dedykowanej instancji.

---

## 3. Model 2 - Shielded (high-level roadmap)

### 3.1. W jednym zdaniu

> Model 2 - Shielded to wariant, w którym **najbardziej wrażliwe dane pozostają w infrastrukturze klienta**, a do Enabion trafiają tylko przetworzone informacje (streszczenia, embeddingi, metadane).

Model 2 jest projektowany z myślą o:

- firmach z wyższymi wymaganiami bezpieczeństwa (np. klienci z sektora finansowego czy większe korporacje),
- sytuacjach, gdy klient nie chce, by pełna treść dokumentów/kontraktów opuszczała jego infrastrukturę.

### 3.2. Gdzie są dane w Modelu 2?

- Surowe, wrażliwe dane (np. pełne kontrakty, dane klientów końcowych) pozostają w **infrastrukturze klienta** (on-prem lub w jego VPC).  
- Enabion otrzymuje:
  - streszczenia,
  - wybrane metadane,
  - embeddingi / wektorowe reprezentacje,
  - sygnały z procesu (np. statusy milestone'ów, wyniki ODR).

W praktyce oznacza to, że do pełnej rekonstrukcji treści dokumentu nadal potrzeba dostępu do środowiska klienta - Enabion samodzielnie nie ma takiej możliwości.

### 3.3. Jak działa AI w Modelu 2?

- Część AI działa po stronie Enabion na opublikowanych streszczeniach/metadanych.  
- Część (np. szczegółowa analiza dokumentów) może działać w **lokalnym „AI Runnerze"** uruchomionym w infrastrukturze klienta, który komunikuje się z Enabion przez kontrolowany interfejs.  
- Dane przekazywane do Enabion są „tarczą" (shield) - pozwalają na pracę na poziomie Intentów, ryzyk i statusów, ale nie ujawniają pełnej treści.

### 3.4. Docelowe use case'y Modelu 2

- Klient ma własne repo dokumentów/kontraktów i wymaga, aby one **nie opuszczały** jego VPC.  
- Enabion ma być „oknem" na proces współpracy (Intenty, statusy, ryzyka, TrustScore), ale bez utrzymywania pełnej treści dokumentów.  
- Współpraca z integratorami / partnerami technologicznymi, którzy budują connector on-prem.

> Uwaga: w R1.0 architektura Enabion jest przygotowywana pod Model 2, ale **sam Model 2 nie jest jeszcze dostępny produkcyjnie**.

---

## 4. Model 3 - Sovereign (high-level roadmap)

### 4.1. W jednym zdaniu

> Model 3 - Sovereign to **dedykowana, suwerenna instancja Enabion** dla jednego dużego klienta lub grupy klientów (np. sektorowych), z pełną kontrolą nad lokalizacją danych i kluczami szyfrującymi (BYOK).

### 4.2. Kluczowe cechy Modelu 3

- **Single-tenant** - osobna instancja Enabion (aplikacja, bazy danych, logi) dedykowana dla danego klienta lub ekosystemu.  
- **Data residency** - możliwość wyboru regionu przechowywania danych (np. EU-only, krajowy DC).  
- **BYOK (Bring Your Own Key)** - klucze szyfrujące zarządzane przez klienta (lub jego zaufanego dostawcę).  
- Pełne logi i audyty mogą być dostępne dla zespołów wewnętrznych (CISO, audyt, regulator).

### 4.3. Dla kogo jest Model 3?

- Duże banki, instytucje rządowe, sektor obronny.  
- Operatorzy ekosystemów (np. krajowe lub branżowe Hubs), którzy potrzebują standardu BCOS, ale nie chcą danych w publicznej instancji Enabion.  
- Klienci z wymaganiami formalnymi typu „system krytyczny" lub „system o znaczeniu istotnym" (NIS2).

### 4.4. Jak Model 3 różni się od Modelu 2?

- Model 2 - Shielded zakłada, że Enabion jest nadal usługą multi-tenant, ale część danych nie jest do niej w ogóle wysyłana.  
- Model 3 - Sovereign zakłada, że **cały Enabion** (aplikacja + dane) jest dedykowany dla danego klienta, a do tego można dodatkowo stosować techniki z Modelu 2 wewnątrz tej instancji.

---

## 5. Co jest dostępne w R1.0 (MVP)?

W R1.0:

- w pełni wspierany i dostępny **Model 1 - Standard**,  
- architektura i dokumentacja **przygotowują** system do wdrożenia Modeli 2-3 w kolejnych release'ach (R2.0+),  
- komunikacja z klientami powinna jasno wskazywać, że:
  - **dzisiaj** (R1.0) klient korzysta z modelu **Standard SaaS**,  
  - scenariusze shielded/sovereign są w **planie rozwoju** i nie są jeszcze zobowiązaniem kontraktowym.

Przykładowy komunikat biznesowy:

> „Enabion R1.0 działa jako bezpieczna, multi-tenantowa usługa SaaS (Model 1 - Standard). Dla klientów z wyższymi wymaganiami bezpieczeństwa przygotowujemy Model 2 - Shielded i Model 3 - Sovereign, w których najbardziej wrażliwe dane pozostają w Waszej infrastrukturze lub w dedykowanej instancji Enabion."

---

## 6. Jak korzystać z tego dokumentu w rozmowach z klientami

- **CEO / Sales** - używa tego dokumentu jako prostego wyjaśnienia „gdzie są dane" i „co planujemy dalej", bez wchodzenia w szczegóły architektury.  
- **CISO / CIO / Legal** - dostaje tutaj „mapę pojęć" i może na tej podstawie pytać o:
  - dokładne mechanizmy szyfrowania,
  - logi audytowe,
  - integracje on-prem,  
  które są doprecyzowywane w osobnych dokumentach technicznych (Architecture Overview, Data & Event Model, AI Governance & Compliance Brief).

---

## 7. Podsumowanie - trzy poziomy zaufania do danych

- **Model 1 - Standard** - szybki start, pełna funkcjonalność MVP, dane w chmurze Enabion.  
- **Model 2 - Shielded** - dane „za tarczą" w infrastrukturze klienta; do Enabion trafiają streszczenia i sygnały.  
- **Model 3 - Sovereign** - dedykowana instancja z pełną suwerennością nad danymi i kluczami.

R1.0 to **świadomie zaprojektowane wejście** w Model 1 z jasną drogą do Modeli 2-3, a nie ślepa uliczka architektoniczna.

