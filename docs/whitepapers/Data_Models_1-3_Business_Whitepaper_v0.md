# Data Models 1-3 - Business Whitepaper (v0)

Status: Draft internal - v0  
Release focus: R1.0 (Model 1 only; Models 2-3 as roadmap)  
Date: 2025-12-10  
Audience: CEO, CTO/CIO, CISO, legal, sales / partner teams  

---

## 1. Dlaczego w og?le modele danych

Enabion ma dzia?a? w bardzo r??nych ?rodowiskach:

- od ma?ych i ?rednich firm technologicznych (software houses, agencje, konsulting),  
- przez korporacje z dzia?ami zakup?w i compliance,  
- a? po sektor regulowany (banki, gov, defence).

Te organizacje maj? **r??ne wymagania dotycz?ce tego, gdzie przechowywane s? dane, kto ma do nich dost?p i jak mo?e dzia?a? AI**. Zamiast jednego ?sztywnego" modelu, Enabion u?ywa **trzech poziom?w modelu danych**:

1. **Model 1 - Standard** - szybki start w chmurze Enabion (multi-tenant SaaS).  
2. **Model 2 - Shielded** - wra?liwe dane pozostaj? ?za tarcz?" w infrastrukturze klienta.  
3. **Model 3 - Sovereign** - pe?na suwerenno??: dedykowana instancja, BYOK, data residency.

Wersja R1.0 dostarcza w pe?ni **Model 1 - Standard**. Modele 2-3 s? opisane tutaj jako **jasna ?cie?ka rozwoju** i punkt wyj?cia do rozm?w z klientami enterprise.

---

## 2. Model 1 - Standard (SaaS)

### 2.1. W jednym zdaniu

> Model 1 - Standard to **multi-tenantowa chmura Enabion**, w kt?rej dane projekt?w (L1 + cz??? L2) s? przechowywane i przetwarzane w infrastrukturze Enabion, z domy?lnymi standardami bezpiecze?stwa i audytu.

### 2.2. Dla kogo jest Model 1

- Firmy X (software houses, agencje, konsulting) 5-500 os?b.  
- Klienci, kt?rzy korzystaj? ju? dzi? z SaaS (np. Jira, HubSpot, Slack) i akceptuj? model multi-tenant.  
- Organizacje, dla kt?rych g??wnym problemem jest **chaos wok?? Intent?w i pre-sales**, a nie ekstremalne wymagania regulacyjne.

### 2.3. Gdzie s? dane

W Modelu 1:

- Dane **L1** (tre?ci ?konferencyjne") i wybrane dane **L2** s? przechowywane w chmurze Enabion.  
- Baza danych, event log i logi AI mieszkaj? w regionach chmurowych zarz?dzanych przez Enabion (np. EU-hosted).  
- Enabion odpowiada za:
  - backupy,
  - logi audytowe,
  - podstawowe mechanizmy bezpiecze?stwa (szyfrowanie w spoczynku i w tranzycie, kontrola dost?pu).

### 2.4. Jak dzia?a AI w Modelu 1

- Avatary (System, Org Avatar X, Intent Coach) korzystaj? z danych przechowywanych w Enabion:  
  - tre?ci Intent?w,
  - metadanych projekt?w,
  - historii interakcji (event log).
- Dane mog? by? przekazywane do modeli AI (foundation models, fine-tuned) zgodnie z polityk? Enabion i obowi?zuj?cymi regulacjami - z naciskiem na EU-kompatybilno??.

### 2.5. Typowe use case'y

- Firma X otrzymuje maile od klient?w i zamienia je w Intenty (Clarify -> Match -> Commit).  
- Ca?y pipeline pre-sales (i podstawowe metryki) dzia?a w Enabion bez konieczno?ci stawiania w?asnej infrastruktury.  
- Klientowi wystarcza standardowy DPA i opis Modelu 1 - nie potrzebuje w?asnego on-prem ani dedykowanej instancji.

---

## 3. Model 2 - Shielded (high-level roadmap)

### 3.1. W jednym zdaniu

> Model 2 - Shielded to wariant, w kt?rym **najbardziej wra?liwe dane pozostaj? w infrastrukturze klienta**, a do Enabion trafiaj? tylko przetworzone informacje (streszczenia, embeddingi, metadane).

Model 2 jest projektowany z my?l? o:

- firmach z wy?szymi wymaganiami bezpiecze?stwa (np. klienci z sektora finansowego czy wi?ksze korporacje),
- sytuacjach, gdy klient nie chce, by pe?na tre?? dokument?w/kontrakt?w opuszcza?a jego infrastruktur?.

### 3.2. Gdzie s? dane w Modelu 2

- Surowe, wra?liwe dane (np. pe?ne kontrakty, dane klient?w ko?cowych) pozostaj? w **infrastrukturze klienta** (on-prem lub w jego VPC).  
- Enabion otrzymuje:
  - streszczenia,
  - wybrane metadane,
  - embeddingi / wektorowe reprezentacje,
  - sygna?y z procesu (np. statusy milestone'?w, wyniki ODR).

W praktyce oznacza to, ?e do pe?nej rekonstrukcji tre?ci dokumentu nadal potrzeba dost?pu do ?rodowiska klienta - Enabion samodzielnie nie ma takiej mo?liwo?ci.

### 3.3. Jak dzia?a AI w Modelu 2

- Cz??? AI dzia?a po stronie Enabion na opublikowanych streszczeniach/metadanych.  
- Cz??? (np. szczeg??owa analiza dokument?w) mo?e dzia?a? w **lokalnym ?AI Runnerze"** uruchomionym w infrastrukturze klienta, kt?ry komunikuje si? z Enabion przez kontrolowany interfejs.  
- Dane przekazywane do Enabion s? ?tarcz?" (shield) - pozwalaj? na prac? na poziomie Intent?w, ryzyk i status?w, ale nie ujawniaj? pe?nej tre?ci.

### 3.4. Docelowe use case'y Modelu 2

- Klient ma w?asne repo dokument?w/kontrakt?w i wymaga, aby one **nie opuszcza?y** jego VPC.  
- Enabion ma by? ?oknem" na proces wsp??pracy (Intenty, statusy, ryzyka, TrustScore), ale bez utrzymywania pe?nej tre?ci dokument?w.  
- Wsp??praca z integratorami / partnerami technologicznymi, kt?rzy buduj? connector on-prem.

> Uwaga: w R1.0 architektura Enabion jest przygotowywana pod Model 2, ale **sam Model 2 nie jest jeszcze dost?pny produkcyjnie**.

---

## 4. Model 3 - Sovereign (high-level roadmap)

### 4.1. W jednym zdaniu

> Model 3 - Sovereign to **dedykowana, suwerenna instancja Enabion** dla jednego du?ego klienta lub grupy klient?w (np. sektorowych), z pe?n? kontrol? nad lokalizacj? danych i kluczami szyfruj?cymi (BYOK).

### 4.2. Kluczowe cechy Modelu 3

- **Single-tenant** - osobna instancja Enabion (aplikacja, bazy danych, logi) dedykowana dla danego klienta lub ekosystemu.  
- **Data residency** - mo?liwo?? wyboru regionu przechowywania danych (np. EU-only, krajowy DC).  
- **BYOK (Bring Your Own Key)** - klucze szyfruj?ce zarz?dzane przez klienta (lub jego zaufanego dostawc?).  
- Pe?ne logi i audyty mog? by? dost?pne dla zespo??w wewn?trznych (CISO, audyt, regulator).

### 4.3. Dla kogo jest Model 3

- Du?e banki, instytucje rz?dowe, sektor obronny.  
- Operatorzy ekosystem?w (np. krajowe lub bran?owe Hubs), kt?rzy potrzebuj? standardu BCOS, ale nie chc? danych w publicznej instancji Enabion.  
- Klienci z wymaganiami formalnymi typu ?system krytyczny" lub ?system o znaczeniu istotnym" (NIS2).

### 4.4. Jak Model 3 r??ni si? od Modelu 2

- Model 2 - Shielded zak?ada, ?e Enabion jest nadal us?ug? multi-tenant, ale cz??? danych nie jest do niej w og?le wysy?ana.  
- Model 3 - Sovereign zak?ada, ?e **ca?y Enabion** (aplikacja + dane) jest dedykowany dla danego klienta, a do tego mo?na dodatkowo stosowa? techniki z Modelu 2 wewn?trz tej instancji.

---

## 5. Co jest dost?pne w R1.0 (MVP)

W R1.0:

- w pe?ni wspierany i dost?pny **Model 1 - Standard**,  
- architektura i dokumentacja **przygotowuj?** system do wdro?enia Modeli 2-3 w kolejnych release'ach (R2.0+),  
- komunikacja z klientami powinna jasno wskazywa?, ?e:
  - **dzisiaj** (R1.0) klient korzysta z modelu **Standard SaaS**,  
  - scenariusze shielded/sovereign s? w **planie rozwoju** i nie s? jeszcze zobowi?zaniem kontraktowym.

Przyk?adowy komunikat biznesowy:

> ?Enabion R1.0 dzia?a jako bezpieczna, multi-tenantowa us?uga SaaS (Model 1 - Standard). Dla klient?w z wy?szymi wymaganiami bezpiecze?stwa przygotowujemy Model 2 - Shielded i Model 3 - Sovereign, w kt?rych najbardziej wra?liwe dane pozostaj? w Waszej infrastrukturze lub w dedykowanej instancji Enabion."

---

## 6. Jak korzysta? z tego dokumentu w rozmowach z klientami

- **CEO / Sales** - u?ywa tego dokumentu jako prostego wyja?nienia ?gdzie s? dane" i ?co planujemy dalej", bez wchodzenia w szczeg??y architektury.  
- **CISO / CIO / Legal** - dostaje tutaj ?map? poj??" i mo?e na tej podstawie pyta? o:
  - dok?adne mechanizmy szyfrowania,
  - logi audytowe,
  - integracje on-prem,  
  kt?re s? doprecyzowywane w osobnych dokumentach technicznych (Architecture Overview, Data & Event Model, AI Governance & Compliance Brief).

---

## 7. Podsumowanie - trzy poziomy zaufania do danych

- **Model 1 - Standard** - szybki start, pe?na funkcjonalno?? MVP, dane w chmurze Enabion.  
- **Model 2 - Shielded** - dane ?za tarcz?" w infrastrukturze klienta; do Enabion trafiaj? streszczenia i sygna?y.  
- **Model 3 - Sovereign** - dedykowana instancja z pe?n? suwerenno?ci? nad danymi i kluczami.

R1.0 to **?wiadomie zaprojektowane wej?cie** w Model 1 z jasn? drog? do Modeli 2-3, a nie ?lepa uliczka architektoniczna.

