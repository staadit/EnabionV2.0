# Integrations Playbook - Email -> Intent (MVP)

Status: Draft internal  
Version: 0.1  
Release: R1.0 - MVP - "Intent & Pre-Sales OS for X"  
Date: 2025-12-10  
Owner: CTO (Mieszko)  

Related issues: #1, #2, #3, #5, #8, #11  
Related docs:  
- `docs/Phase1_MVP-Spec.md` (Product Spec R1.0)  
- `docs/Phase1_Architecture_Overview_R1.0_MVP.md`  
- `docs/engineering/Definition_of_Done_R1.0.md`  

---

## 1. Cel dokumentu

Ten dokument opisuje, jak w Release R1.0 dzia?a integracja **Email -> Intent**:

- jaki jest **format adres?w** e-mail dla organizacji X,
- jak mapujemy **nag??wki i tre?? maila** na pola **Intentu**,
- jakie s? **limity i zasady obs?ugi za??cznik?w**,
- jak dzia?a **detekcja j?zyka i wyb?r j?zyka Avatara**,
- jakie obowi?zuj? **regu?y bezpiecze?stwa / anti-abuse**,
- jakie **edge case'y** obs?ugujemy w MVP.

Docelowy odbiorca: dev team (backend, integrations), AI team (Intent Coach), zesp?? produktowy.

Zakres dotyczy wy??cznie kierunku **Email -> Intent**. Wysy?anie maili z Enabion (Intent -> email out) jest poza zakresem R1.0 i wymaga osobnego epika.

---

## 2. Architektura wysokiego poziomu

### 2.1. G??wne komponenty

- **MX dla domeny `*.enabion.com`** - odbiera maile kierowane na aliasy Intent?w.
- **Email Intake Service (EIS)** - dedykowany serwis, kt?ry:
  - odbiera i weryfikuje wiadomo?ci e-mail,
  - rozpoznaje organizacj? (`orgSlug`) na podstawie adresu docelowego,
  - mapuje nag??wki i tre?? maila na struktur? **Intentu**,
  - decyduje, czy:
    - utworzy? **nowy Intent**, czy
    - zaktualizowa? **istniej?cy Intent** (kolejny mail w w?tku),
  - publikuje odpowiednie eventy do BCOS Core.
- **BCOS Core / API** - przyjmuje ??dania utworzenia/aktualizacji Intentu + eventy:
  - `INTENT_CREATED`,
  - `INTENT_UPDATED`,
  - `EMAIL_THREAD_BOUND_TO_INTENT`.

- **AI Gateway / Intent Coach** - opcjonalnie wywo?ywany po utworzeniu Intentu do:
  - wst?pnego uporz?dkowania tre?ci (Clarify),
  - wykrycia brak?w i zaproponowania pyta?.

### 2.2. Typowy przep?yw (happy path)

1. U?ytkownik X wysy?a nowy mail do klienta lub forwarduje istniej?cy mail:
   - dodaje w polu **To** lub **Cc** adres `intent@{orgSlug}.enabion.com`.
2. Mail trafia do MX i dalej do **Email Intake Service**.
3. EIS:
   - sprawdza podstawowe nag??wki (FROM/TO/CC/BCC, `Message-Id`, `In-Reply-To`),
   - identyfikuje organizacj? X na podstawie `{orgSlug}`,
   - mapuje zawarto?? maila na **Intent draft**,
   - sprawdza, czy istnieje powi?zany w?tek (`EmailThreadBinding`),
   - tworzy nowy Intent lub aktualizuje istniej?cy,
   - loguje eventy do BCOS Core.
4. Po utworzeniu/aktualizacji Intentu:
   - opcjonalnie wywo?ywany jest **Intent Coach**, kt?ry:
     - proponuje struktur? (cel, kontekst, zakres, KPI, ryzyka),
     - wskazuje braki i pytania,
   - wynik jest zapisany jako `AVATAR_SUGGESTION_ISSUED` i widoczny w UI Intentu.

---

## 3. Adresy e-mail i rozpoznawanie organizacji

### 3.1. Wzorzec adresu

W R1.0 przyjmujemy jeden g??wny wzorzec adresu dla organizacji X:

```text
intent@{orgSlug}.enabion.com
```

- `orgSlug` - unikalny, ma?ymi literami, alfanumeryczny slug organizacji X, nadawany przy onboardingu (np. `brightcode`, `northwindit`).
- Dla ka?dej organizacji istnieje dok?adnie jeden taki alias.

Opcjonalnie (future-proof, niekoniecznie w R1.0):

- alias globalny `intent@enabion.com` z tagiem w temacie/tre?ci (np. `[org:brightcode]`), kt?ry r?wnie? mo?e mapowa? na `orgSlug`.
- W R1.0 mo?emy obs?u?y? taki alias jedynie w trybie ?laboratoryjnym" dla pilota?y - nie jako oficjaln? funkcj? UI.

### 3.2. Przypisanie maila do organizacji

1. EIS parsuje adresy z nag??wk?w `To` i `Cc`.
2. Znajduje adres postaci `intent@{orgSlug}.enabion.com`.
3. Na podstawie `{orgSlug}` wyszukuje **Org** w BCOS (wym?g: slug jest unikalny).
4. Je?li `orgSlug` nie istnieje:
   - mail jest **odrzucany**,
   - logujemy zdarzenie `EMAIL_REJECTED_UNKNOWN_ORG`,
   - w przysz?o?ci mo?emy wysy?a? bounce; w R1.0 wystarczy logowanie i raport w panelu admina.

### 3.3. Internal vs external sender

- Je?li domena nadawcy (`From`) odpowiada jednej z domen zdefiniowanych w profilu organizacji X (`org.primary_domain` lub aliasy), nadawca jest traktowany jako **u?ytkownik X** (internal).
- W przeciwnym przypadku nadawca jest traktowany jako **kontakt zewn?trzny Y/Z**:
  - je?li istnieje ju? w bazie Contact, u?ywamy istniej?cego rekordu,
  - w przeciwnym razie tworzymy nowy `Contact` powi?zany z Intentem.

To rozr??nienie jest kluczowe do p??niejszych metryk (np. czas odpowiedzi na Intent klienta).

---

## 4. Regu?y ?nowy Intent" vs ?aktualizacja Intentu"

### 4.1. Nowy Intent

Tworzymy **nowy Intent**, je?li spe?nione s? wszystkie warunki:

- mail jest skierowany do `intent@{orgSlug}.enabion.com` (To/Cc),
- dla warto?ci `Message-Id` nie istnieje jeszcze ?aden wpis w `EmailMessage`,
- nie znajdujemy dopasowania po `In-Reply-To` / `References` w `EmailThreadBinding`,
- temat nie jest zmapowany na istniej?cy Intent z tym samym `thread_key` (patrz ni?ej).

W takim przypadku:

1. Tworzymy nowy rekord `EmailThread` z kluczem:

   ```text
   thread_key = hash(<Message-Id> + normalized_subject)
   ```

2. Tworzymy nowy **Intent** w stanie **New**:
   - `Intent.title` z tematu (po oczyszczeniu z prefiks?w typu `Re:`, `Fw:`),
   - `Intent.source_type = "email"`,
   - `Intent.source_thread_key = thread_key`,
   - `Intent.primary_contact` na podstawie `From` (zewn?trzny kontakt) lub przypisany u?ytkownik X (je?li mail jest z wewn?trz).
3. Emitujemy eventy:
   - `INTENT_CREATED`,
   - `EMAIL_THREAD_BOUND_TO_INTENT`.

### 4.2. Aktualizacja istniej?cego Intentu

Aktualizujemy istniej?cy Intent je?li:

1. `In-Reply-To` lub `References` wskazuje na znany `EmailMessage` powi?zany z `EmailThread` z istniej?cym `Intent.id`, **lub**
2. `thread_key` (hash po `Message-Id` + `normalized_subject`) pasuje do istniej?cego Intentu **i** nadawca jest jednym z uczestnik?w w?tku (X lub Y).

W takim przypadku:

- Tworzymy nowy rekord `EmailMessage` powi?zany z `EmailThread`,
- dodajemy wpis w logu aktywno?ci Intentu (`INTENT_UPDATED`),
- mo?emy (opcjonalnie) wywo?a? Intent Coach do wygenerowania **podsumowania nowej korespondencji** w sekcji komentarzy Intentu (R1.0 - nice-to-have, nie koniecznie w pierwszym cut).

---

## 5. Mapowanie p?l e-mail -> Intent

### 5.1. Tabela mapowania

| Element e-mail | Pole w Intent / BCOS | Zasady |
|----------------|----------------------|--------|
| `Subject`      | `Intent.title`       | Usuwamy prefiksy `Re:`, `Fwd:`; ograniczamy d?ugo?? (np. 200 znak?w); u?ytkownik mo?e p??niej edytowa? w UI. |
| `Body` (text/plain lub HTML) | `Intent.raw_description` | W R1.0 przechowujemy ca?e cia?o maila (po podstawowym oczyszczeniu z sygnaturek, disclaimer?w i historii w?tku je?li wykryte). |
| `From`         | `Contact` / `User`   | Je?li domena wewn?trzna - mapujemy do `User`; je?li zewn?trzna - do `Contact`. |
| `To`, `Cc`     | `Intent.participants` | Tworzymy list? uczestnik?w (User/Contact); Enabion alias (`intent@{orgSlug}.enabion.com`) jest ignorowany jako uczestnik. |
| `Date`         | `Intent.source_received_at` | Data/godzina przyj?cia maila (UTC). |
| `Message-Id`   | `EmailMessage.message_id` / `EmailThread.thread_key` | S?u?y do powi?zania z w?tkiem. |
| Za??czniki     | `Intent.attachments` | W R1.0: pliki s? zapisywane jako za??czniki (L1/L2 - zgodnie z domy?lnym poziomem Intentu); nie s? automatycznie analizowane przez AI. |

### 5.2. Poziom poufno?ci (L1/L2) dla maili

- Domy?lnie ca?y mail trafia jako **L1** (dane ?konferencyjne").  
- Je?li u?ytkownik X w tytule lub tre?ci u?yje oznaczenia `[L2]`, ca?y Intent (wraz z tre?ci? maila) jest ustawiany jako **L2** i wymaga aktywnej Enabion Mutual NDA wzgl?dem partnera Y, zanim zostanie udost?pniony na zewn?trz.
- W R1.0 nie rozr??niamy jeszcze L3 - jest to placeholder w UI.

---

## 6. Detekcja j?zyka i wyb?r j?zyka Avatara

### 6.1. Wspierane j?zyki w R1.0

- Rynki docelowe: **PL, DE, NL**.  
- Avatary musz? rozumie? i generowa? tre?ci w **PL, DE, NL oraz EN**.  
- EN jest j?zykiem domy?lnym / fallback.

### 6.2. Algorytm wyboru j?zyka Intentu

1. EIS ??czy `Subject` + `Body` i wykonuje detekcj? j?zyka (np. przez bibliotek? CLD / model LLM).
2. Je?eli wynik jest jednoznaczny i nale?y do {PL, DE, NL, EN}, to:
   - `Intent.language = detected_language`.
3. Je?eli wynik jest niejednoznaczny lub ?aden z powy?szych j?zyk?w nie dominuje:
   - je?li org X ma ustawiony domy?lny j?zyk (np. `org.default_language`), u?yj go,
   - w przeciwnym razie ustaw `Intent.language = "EN"`.
4. Intent Coach domy?lnie odpowiada w `Intent.language`, ale u?ytkownik mo?e w UI prze??czy? j?zyk Avatara dla danego Intentu.

### 6.3. Prze??czanie j?zyka w UI

- W widoku Intentu u?ytkownik mo?e zmieni? j?zyk Intentu (np. z DE na EN).  
- Zmiana j?zyka:
  - nie zmienia historii maili,
  - wp?ywa na j?zyk kolejnych odpowiedzi Avatara,
  - mo?e zosta? zalogowana jako event (`INTENT_LANGUAGE_CHANGED`).

---

## 7. Za??czniki - limity i zasady

### 7.1. Obs?ugiwane typy plik?w (R1.0)

- Dozwolone i przechowywane:
  - `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `md`, `csv`, `png`, `jpg`, `jpeg`.
- Ignorowane (mail nadal tworzy Intent, ale plik nie jest przechowywany):
  - pliki wykonywalne (`.exe`, `.bat`, `.cmd`, `.sh`),
  - archiwa z potencjalnie niebezpieczn? zawarto?ci? (`.zip`, `.rar`, `.7z`) - w R1.0 mo?na przyj?? polityk? ?dozwolone, ale nie parsowane"; decyzja operacyjna do potwierdzenia.

### 7.2. Limity rozmiaru

- Limit ca?kowity rozmiaru za??cznik?w na jeden mail: np. **15 MB** (konfigurowalne w infrastrukturze).  
- Je?li limit zostanie przekroczony:
  - mail nadal mo?e utworzy? Intent,
  - za??czniki powy?ej limitu s? **odrzucane**,
  - w opisie Intentu zapisujemy notatk? w stylu:  
    ?One or more attachments were not stored due to size limits (see Email Intake logs)."

### 7.3. Powi?zanie z poziomem poufno?ci

- Wszystkie za??czniki dziedzicz? domy?lny poziom Intentu (L1 / L2).  
- W R1.0 nie ma jeszcze granularnego oznaczania poufno?ci per plik.

---

## 8. Regu?y bezpiecze?stwa i anti-abuse (MVP)

Celem jest minimalna, ale sensowna ochrona przed nadu?yciami, bez budowania w?asnego systemu antyspamowego.

### 8.1. Zaufanie do filtr?w pocztowych

- Zak?adamy, ?e g??wny filtr spamowy dzia?a po stronie dostawcy poczty (np. Microsoft 365, Google Workspace).  
- EIS mo?e sprawdza? nag??wki typu `X-Spam-Status` / `X-Spam-Flag` i:
  - oznacza? maile jako `spam_suspected`,
  - nie tworzy? Intentu automatycznie, a przenosi? je do ?Spam / Needs review" w panelu admina (future).

### 8.2. SPF/DKIM/DMARC (wysoki poziom)

- EIS powinien mie? dost?p do wyniku walidacji SPF/DKIM/DMARC (z nag??wk?w lub z konfiguracji MTA).  
- W R1.0 minimalna polityka:

  - je?li wszystkie trzy mechanizmy jednoznacznie wskazuj? na **fail**, mail mo?e by? oznaczony jako `spam_suspected`,
  - nie blokujemy tworzenia Intentu wy??cznie na tej podstawie, ale logujemy pow?d; decyzja biznesowa mo?e ulec zmianie po pilota?ach.

### 8.3. Kto mo?e tworzy? Intent przez e-mail

- **Domy?lnie:** ka?dy, kto wy?le maila na `intent@{orgSlug}.enabion.com` mo?e spowodowa? utworzenie Intentu.  
- Rola EIS:
  - ustawi? `Intent.created_via = "email"`,
  - przypisa? `Intent.primary_contact` do nadawcy maila (Contact / User).
- Organizacja X mo?e nast?pnie w UI:
  - oznaczy? Intent jako **valid / spam / test**,  
  - usun?? lub zarchiwizowa? niechciane Intenty (zgodnie z polityk? danych).

W kolejnych release'ach mo?emy doda? listy allow/deny per organizacja.

---

## 9. Edge case'y

### 9.1. Pusty mail (brak tre?ci)

- Je?li mail nie zawiera ?adnego tekstu, ale ma za??czniki:
  - tworzymy Intent z `Intent.title` z tematu,
  - `Intent.raw_description` = ?(Email body was empty. Please review attachments.)",
  - za??czniki s? zapisane zgodnie z regu?ami z sekcji 7.

- Je?li mail nie ma ani tre?ci, ani za??cznik?w:
  - Intent jest tworzony z minimalnym opisem,
  - logujemy zdarzenie `INTENT_WITH_EMPTY_EMAIL_BODY`,
  - w UI mo?na doda? manualny opis.

### 9.2. Forward kilku w?tk?w naraz

- W R1.0 traktujemy taki mail jako **jeden Intent** z pe?n? tre?ci?; u?ytkownik decyduje, czy rozbi? go r?cznie na kilka Intent?w.  
- Intent Coach mo?e zaproponowa? podzia?, ale implementacja automatyczna jest poza zakresem R1.0.

### 9.3. Nieznany j?zyk / mieszany j?zyk

- Je?li detektor j?zyka nie wskazuje jednoznacznie na PL/DE/NL/EN:
  - ustawiamy j?zyk na `org.default_language` lub EN,
  - w UI dodajemy notatk?: ?Language could not be reliably detected; using {lang} as default."

### 9.4. Kilka alias?w Enabion w tym samym mailu

- Je?li w `To`/`Cc` widnieje wi?cej ni? jeden adres `intent@*.enabion.com`:
  - domy?lnie wybieramy **pierwszy** alias jako w?a?ciciela Intentu,
  - pozosta?e s? ignorowane,
  - logujemy ostrze?enie `MULTIPLE_INTENT_ALIASES_IN_EMAIL`.

### 9.5. U?ytkownik usuwa Intent zwi?zany z w?tkiem e-mail

- Usuni?cie Intentu nie powoduje usuni?cia historycznych `EmailMessage`, ale:
  - nowy mail w tym samym w?tku zostanie potraktowany jako **nowy Intent**, je?li poprzedni Intent jest ?hard deleted",
  - je?li stosujemy ?soft delete", mo?na powi?za? nowy mail z archiwalnym Intenem (do decyzji produktowej); w R1.0 bezpieczniej jest traktowa? to jako nowy Intent z referencj? do archiwalnego.

---

## 10. Wymagania niefunkcjonalne (MVP)

- Email Intake Service musi by? **idempotentny** wzgl?dem `Message-Id` - ten sam mail nie mo?e utworzy? dw?ch Intent?w.
- Przetwarzanie maila powinno zako?czy? si? w czasie < 10 s w 95 percentylu (bez gwarancji czasu dostarczenia po stronie operatora poczty).
- Wszystkie b??dy EIS powinny by? logowane z informacj?:
  - orgSlug,
  - nadawca (`From`),
  - temat,
  - pow?d b??du (walidacja / mapowanie / org not found).

---

## 11. Konsekwencje dla innych dokument?w

- **Product Spec (R1.0)**:
  - sekcja ?Integracje - Email -> Intent" powinna odwo?ywa? si? do tego dokumentu jako **?r?d?a prawdy**.
- **Architecture Overview (R1.0)**:
  - Email Intake Service jako osobny komponent (lub modu?) z wyra?nym kontraktem API do BCOS Core.
- **Definition of Done (R1.0)**:
  - DoD dla epika ?Email -> Intent integration" powinien wymaga?:
    - pokrycia g??wnych scenariuszy i edge case'?w testami (przynajmniej manualnymi + smoke/e2e),
    - ?ledzenia event?w `INTENT_CREATED`, `INTENT_UPDATED`, `EMAIL_THREAD_BOUND_TO_INTENT` dla maili przychodz?cych.

