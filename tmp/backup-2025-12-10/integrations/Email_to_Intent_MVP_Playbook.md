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

Ten dokument opisuje, jak w Release R1.0 działa integracja **Email -> Intent**:

- jaki jest **format adresów** e-mail dla organizacji X,
- jak mapujemy **nagłówki i treść maila** na pola **Intentu**,
- jakie są **limity i zasady obsługi załączników**,
- jak działa **detekcja języka i wybór języka Avatara**,
- jakie obowiązują **reguły bezpieczeństwa / anti-abuse**,
- jakie **edge case'y** obsługujemy w MVP.

Docelowy odbiorca: dev team (backend, integrations), AI team (Intent Coach), zespół produktowy.

Zakres dotyczy wyłącznie kierunku **Email -> Intent**. Wysyłanie maili z Enabion (Intent -> email out) jest poza zakresem R1.0 i wymaga osobnego epika.

---

## 2. Architektura wysokiego poziomu

### 2.1. Główne komponenty

- **MX dla domeny `*.enabion.com`** - odbiera maile kierowane na aliasy Intentów.
- **Email Intake Service (EIS)** - dedykowany serwis, który:
  - odbiera i weryfikuje wiadomości e-mail,
  - rozpoznaje organizację (`orgSlug`) na podstawie adresu docelowego,
  - mapuje nagłówki i treść maila na strukturę **Intentu**,
  - decyduje, czy:
    - utworzyć **nowy Intent**, czy
    - zaktualizować **istniejący Intent** (kolejny mail w wątku),
  - publikuje odpowiednie eventy do BCOS Core.
- **BCOS Core / API** - przyjmuje żądania utworzenia/aktualizacji Intentu + eventy:
  - `INTENT_CREATED`,
  - `INTENT_UPDATED`,
  - `EMAIL_THREAD_BOUND_TO_INTENT`.

- **AI Gateway / Intent Coach** - opcjonalnie wywoływany po utworzeniu Intentu do:
  - wstępnego uporządkowania treści (Clarify),
  - wykrycia braków i zaproponowania pytań.

### 2.2. Typowy przepływ (happy path)

1. Użytkownik X wysyła nowy mail do klienta lub forwarduje istniejący mail:
   - dodaje w polu **To** lub **Cc** adres `intent@{orgSlug}.enabion.com`.
2. Mail trafia do MX i dalej do **Email Intake Service**.
3. EIS:
   - sprawdza podstawowe nagłówki (FROM/TO/CC/BCC, `Message-Id`, `In-Reply-To`),
   - identyfikuje organizację X na podstawie `{orgSlug}`,
   - mapuje zawartość maila na **Intent draft**,
   - sprawdza, czy istnieje powiązany wątek (`EmailThreadBinding`),
   - tworzy nowy Intent lub aktualizuje istniejący,
   - loguje eventy do BCOS Core.
4. Po utworzeniu/aktualizacji Intentu:
   - opcjonalnie wywoływany jest **Intent Coach**, który:
     - proponuje strukturę (cel, kontekst, zakres, KPI, ryzyka),
     - wskazuje braki i pytania,
   - wynik jest zapisany jako `AVATAR_SUGGESTION_ISSUED` i widoczny w UI Intentu.

---

## 3. Adresy e-mail i rozpoznawanie organizacji

### 3.1. Wzorzec adresu

W R1.0 przyjmujemy jeden główny wzorzec adresu dla organizacji X:

```text
intent@{orgSlug}.enabion.com
```

- `orgSlug` - unikalny, małymi literami, alfanumeryczny slug organizacji X, nadawany przy onboardingu (np. `brightcode`, `northwindit`).
- Dla każdej organizacji istnieje dokładnie jeden taki alias.

Opcjonalnie (future-proof, niekoniecznie w R1.0):

- alias globalny `intent@enabion.com` z tagiem w temacie/treści (np. `[org:brightcode]`), który również może mapować na `orgSlug`.
- W R1.0 możemy obsłużyć taki alias jedynie w trybie „laboratoryjnym" dla pilotaży - nie jako oficjalną funkcję UI.

### 3.2. Przypisanie maila do organizacji

1. EIS parsuje adresy z nagłówków `To` i `Cc`.
2. Znajduje adres postaci `intent@{orgSlug}.enabion.com`.
3. Na podstawie `{orgSlug}` wyszukuje **Org** w BCOS (wymóg: slug jest unikalny).
4. Jeśli `orgSlug` nie istnieje:
   - mail jest **odrzucany**,
   - logujemy zdarzenie `EMAIL_REJECTED_UNKNOWN_ORG`,
   - w przyszłości możemy wysyłać bounce; w R1.0 wystarczy logowanie i raport w panelu admina.

### 3.3. Internal vs external sender

- Jeśli domena nadawcy (`From`) odpowiada jednej z domen zdefiniowanych w profilu organizacji X (`org.primary_domain` lub aliasy), nadawca jest traktowany jako **użytkownik X** (internal).
- W przeciwnym przypadku nadawca jest traktowany jako **kontakt zewnętrzny Y/Z**:
  - jeśli istnieje już w bazie Contact, używamy istniejącego rekordu,
  - w przeciwnym razie tworzymy nowy `Contact` powiązany z Intentem.

To rozróżnienie jest kluczowe do późniejszych metryk (np. czas odpowiedzi na Intent klienta).

---

## 4. Reguły „nowy Intent" vs „aktualizacja Intentu"

### 4.1. Nowy Intent

Tworzymy **nowy Intent**, jeśli spełnione są wszystkie warunki:

- mail jest skierowany do `intent@{orgSlug}.enabion.com` (To/Cc),
- dla wartości `Message-Id` nie istnieje jeszcze żaden wpis w `EmailMessage`,
- nie znajdujemy dopasowania po `In-Reply-To` / `References` w `EmailThreadBinding`,
- temat nie jest zmapowany na istniejący Intent z tym samym `thread_key` (patrz niżej).

W takim przypadku:

1. Tworzymy nowy rekord `EmailThread` z kluczem:

   ```text
   thread_key = hash(<Message-Id> + normalized_subject)
   ```

2. Tworzymy nowy **Intent** w stanie **New**:
   - `Intent.title` z tematu (po oczyszczeniu z prefiksów typu `Re:`, `Fw:`),
   - `Intent.source_type = "email"`,
   - `Intent.source_thread_key = thread_key`,
   - `Intent.primary_contact` na podstawie `From` (zewnętrzny kontakt) lub przypisany użytkownik X (jeśli mail jest z wewnątrz).
3. Emitujemy eventy:
   - `INTENT_CREATED`,
   - `EMAIL_THREAD_BOUND_TO_INTENT`.

### 4.2. Aktualizacja istniejącego Intentu

Aktualizujemy istniejący Intent jeśli:

1. `In-Reply-To` lub `References` wskazuje na znany `EmailMessage` powiązany z `EmailThread` z istniejącym `Intent.id`, **lub**
2. `thread_key` (hash po `Message-Id` + `normalized_subject`) pasuje do istniejącego Intentu **i** nadawca jest jednym z uczestników wątku (X lub Y).

W takim przypadku:

- Tworzymy nowy rekord `EmailMessage` powiązany z `EmailThread`,
- dodajemy wpis w logu aktywności Intentu (`INTENT_UPDATED`),
- możemy (opcjonalnie) wywołać Intent Coach do wygenerowania **podsumowania nowej korespondencji** w sekcji komentarzy Intentu (R1.0 - nice-to-have, nie koniecznie w pierwszym cut).

---

## 5. Mapowanie pól e-mail -> Intent

### 5.1. Tabela mapowania

| Element e-mail | Pole w Intent / BCOS | Zasady |
|----------------|----------------------|--------|
| `Subject`      | `Intent.title`       | Usuwamy prefiksy `Re:`, `Fwd:`; ograniczamy długość (np. 200 znaków); użytkownik może później edytować w UI. |
| `Body` (text/plain lub HTML) | `Intent.raw_description` | W R1.0 przechowujemy całe ciało maila (po podstawowym oczyszczeniu z sygnaturek, disclaimerów i historii wątku jeśli wykryte). |
| `From`         | `Contact` / `User`   | Jeśli domena wewnętrzna - mapujemy do `User`; jeśli zewnętrzna - do `Contact`. |
| `To`, `Cc`     | `Intent.participants` | Tworzymy listę uczestników (User/Contact); Enabion alias (`intent@{orgSlug}.enabion.com`) jest ignorowany jako uczestnik. |
| `Date`         | `Intent.source_received_at` | Data/godzina przyjęcia maila (UTC). |
| `Message-Id`   | `EmailMessage.message_id` / `EmailThread.thread_key` | Służy do powiązania z wątkiem. |
| Załączniki     | `Intent.attachments` | W R1.0: pliki są zapisywane jako załączniki (L1/L2 - zgodnie z domyślnym poziomem Intentu); nie są automatycznie analizowane przez AI. |

### 5.2. Poziom poufności (L1/L2) dla maili

- Domyślnie cały mail trafia jako **L1** (dane „konferencyjne").  
- Jeśli użytkownik X w tytule lub treści użyje oznaczenia `[L2]`, cały Intent (wraz z treścią maila) jest ustawiany jako **L2** i wymaga aktywnej Enabion Mutual NDA względem partnera Y, zanim zostanie udostępniony na zewnątrz.
- W R1.0 nie rozróżniamy jeszcze L3 - jest to placeholder w UI.

---

## 6. Detekcja języka i wybór języka Avatara

### 6.1. Wspierane języki w R1.0

- Rynki docelowe: **PL, DE, NL**.  
- Avatary muszą rozumieć i generować treści w **PL, DE, NL oraz EN**.  
- EN jest językiem domyślnym / fallback.

### 6.2. Algorytm wyboru języka Intentu

1. EIS łączy `Subject` + `Body` i wykonuje detekcję języka (np. przez bibliotekę CLD / model LLM).
2. Jeżeli wynik jest jednoznaczny i należy do {PL, DE, NL, EN}, to:
   - `Intent.language = detected_language`.
3. Jeżeli wynik jest niejednoznaczny lub żaden z powyższych języków nie dominuje:
   - jeśli org X ma ustawiony domyślny język (np. `org.default_language`), użyj go,
   - w przeciwnym razie ustaw `Intent.language = "EN"`.
4. Intent Coach domyślnie odpowiada w `Intent.language`, ale użytkownik może w UI przełączyć język Avatara dla danego Intentu.

### 6.3. Przełączanie języka w UI

- W widoku Intentu użytkownik może zmienić język Intentu (np. z DE na EN).  
- Zmiana języka:
  - nie zmienia historii maili,
  - wpływa na język kolejnych odpowiedzi Avatara,
  - może zostać zalogowana jako event (`INTENT_LANGUAGE_CHANGED`).

---

## 7. Załączniki - limity i zasady

### 7.1. Obsługiwane typy plików (R1.0)

- Dozwolone i przechowywane:
  - `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `md`, `csv`, `png`, `jpg`, `jpeg`.
- Ignorowane (mail nadal tworzy Intent, ale plik nie jest przechowywany):
  - pliki wykonywalne (`.exe`, `.bat`, `.cmd`, `.sh`),
  - archiwa z potencjalnie niebezpieczną zawartością (`.zip`, `.rar`, `.7z`) - w R1.0 można przyjąć politykę „dozwolone, ale nie parsowane"; decyzja operacyjna do potwierdzenia.

### 7.2. Limity rozmiaru

- Limit całkowity rozmiaru załączników na jeden mail: np. **15 MB** (konfigurowalne w infrastrukturze).  
- Jeśli limit zostanie przekroczony:
  - mail nadal może utworzyć Intent,
  - załączniki powyżej limitu są **odrzucane**,
  - w opisie Intentu zapisujemy notatkę w stylu:  
    „One or more attachments were not stored due to size limits (see Email Intake logs)."

### 7.3. Powiązanie z poziomem poufności

- Wszystkie załączniki dziedziczą domyślny poziom Intentu (L1 / L2).  
- W R1.0 nie ma jeszcze granularnego oznaczania poufności per plik.

---

## 8. Reguły bezpieczeństwa i anti-abuse (MVP)

Celem jest minimalna, ale sensowna ochrona przed nadużyciami, bez budowania własnego systemu antyspamowego.

### 8.1. Zaufanie do filtrów pocztowych

- Zakładamy, że główny filtr spamowy działa po stronie dostawcy poczty (np. Microsoft 365, Google Workspace).  
- EIS może sprawdzać nagłówki typu `X-Spam-Status` / `X-Spam-Flag` i:
  - oznaczać maile jako `spam_suspected`,
  - nie tworzyć Intentu automatycznie, a przenosić je do „Spam / Needs review" w panelu admina (future).

### 8.2. SPF/DKIM/DMARC (wysoki poziom)

- EIS powinien mieć dostęp do wyniku walidacji SPF/DKIM/DMARC (z nagłówków lub z konfiguracji MTA).  
- W R1.0 minimalna polityka:

  - jeśli wszystkie trzy mechanizmy jednoznacznie wskazują na **fail**, mail może być oznaczony jako `spam_suspected`,
  - nie blokujemy tworzenia Intentu wyłącznie na tej podstawie, ale logujemy powód; decyzja biznesowa może ulec zmianie po pilotażach.

### 8.3. Kto może tworzyć Intent przez e-mail

- **Domyślnie:** każdy, kto wyśle maila na `intent@{orgSlug}.enabion.com` może spowodować utworzenie Intentu.  
- Rola EIS:
  - ustawić `Intent.created_via = "email"`,
  - przypisać `Intent.primary_contact` do nadawcy maila (Contact / User).
- Organizacja X może następnie w UI:
  - oznaczyć Intent jako **valid / spam / test**,  
  - usunąć lub zarchiwizować niechciane Intenty (zgodnie z polityką danych).

W kolejnych release'ach możemy dodać listy allow/deny per organizacja.

---

## 9. Edge case'y

### 9.1. Pusty mail (brak treści)

- Jeśli mail nie zawiera żadnego tekstu, ale ma załączniki:
  - tworzymy Intent z `Intent.title` z tematu,
  - `Intent.raw_description` = „(Email body was empty. Please review attachments.)",
  - załączniki są zapisane zgodnie z regułami z sekcji 7.

- Jeśli mail nie ma ani treści, ani załączników:
  - Intent jest tworzony z minimalnym opisem,
  - logujemy zdarzenie `INTENT_WITH_EMPTY_EMAIL_BODY`,
  - w UI można dodać manualny opis.

### 9.2. Forward kilku wątków naraz

- W R1.0 traktujemy taki mail jako **jeden Intent** z pełną treścią; użytkownik decyduje, czy rozbić go ręcznie na kilka Intentów.  
- Intent Coach może zaproponować podział, ale implementacja automatyczna jest poza zakresem R1.0.

### 9.3. Nieznany język / mieszany język

- Jeśli detektor języka nie wskazuje jednoznacznie na PL/DE/NL/EN:
  - ustawiamy język na `org.default_language` lub EN,
  - w UI dodajemy notatkę: „Language could not be reliably detected; using {lang} as default."

### 9.4. Kilka aliasów Enabion w tym samym mailu

- Jeśli w `To`/`Cc` widnieje więcej niż jeden adres `intent@*.enabion.com`:
  - domyślnie wybieramy **pierwszy** alias jako właściciela Intentu,
  - pozostałe są ignorowane,
  - logujemy ostrzeżenie `MULTIPLE_INTENT_ALIASES_IN_EMAIL`.

### 9.5. Użytkownik usuwa Intent związany z wątkiem e-mail

- Usunięcie Intentu nie powoduje usunięcia historycznych `EmailMessage`, ale:
  - nowy mail w tym samym wątku zostanie potraktowany jako **nowy Intent**, jeśli poprzedni Intent jest „hard deleted",
  - jeśli stosujemy „soft delete", można powiązać nowy mail z archiwalnym Intenem (do decyzji produktowej); w R1.0 bezpieczniej jest traktować to jako nowy Intent z referencją do archiwalnego.

---

## 10. Wymagania niefunkcjonalne (MVP)

- Email Intake Service musi być **idempotentny** względem `Message-Id` - ten sam mail nie może utworzyć dwóch Intentów.
- Przetwarzanie maila powinno zakończyć się w czasie < 10 s w 95 percentylu (bez gwarancji czasu dostarczenia po stronie operatora poczty).
- Wszystkie błędy EIS powinny być logowane z informacją:
  - orgSlug,
  - nadawca (`From`),
  - temat,
  - powód błędu (walidacja / mapowanie / org not found).

---

## 11. Konsekwencje dla innych dokumentów

- **Product Spec (R1.0)**:
  - sekcja „Integracje - Email -> Intent" powinna odwoływać się do tego dokumentu jako **źródła prawdy**.
- **Architecture Overview (R1.0)**:
  - Email Intake Service jako osobny komponent (lub moduł) z wyraźnym kontraktem API do BCOS Core.
- **Definition of Done (R1.0)**:
  - DoD dla epika „Email -> Intent integration" powinien wymagać:
    - pokrycia głównych scenariuszy i edge case'ów testami (przynajmniej manualnymi + smoke/e2e),
    - śledzenia eventów `INTENT_CREATED`, `INTENT_UPDATED`, `EMAIL_THREAD_BOUND_TO_INTENT` dla maili przychodzących.

