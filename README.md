# Concept2 PM5 - Web Bluetooth Telemetrie & Základ pro hru

Jednoduchá webová aplikace demonstrující čtení realtime metrik z veslovacího trenažéru **Concept2 RowErg** s monitorem **PM5** přes **Web Bluetooth API**.

---

## ⚡ Rychlé spuštění

Web Bluetooth vyžaduje spuštění z lokálního serveru (http://localhost nebo https://). Nelze jej otevřít přímo poklepáním přes ile:// protokol kvůli bezpečnostním zásadám prohlížeče.

### Varianta A: Pomocí Node.js / npx
V terminálu spusťte:
`ash
cd 'G:\My Drive\Coding\RowingGame'
npx serve .
`
A otevřete zobrazenou adresu v **Google Chrome** nebo **Microsoft Edge** (např. http://localhost:3000).

### Varianta B: Pomocí Pythonu
`ash
cd 'G:\My Drive\Coding\RowingGame'
python -m http.server 8000
`
A otevřete http://localhost:8000 v Chrome nebo Edge.

---

## 🚣 Připojení k monitoru PM5

1. Zapněte monitor PM5 tlačítkem **[MENU]** (nebo zatáhněte za madlo).
2. Na obrazovce PM5 zvolte **Connect** (nebo More Options -> Turn Wireless ON).
3. **Důležité:** Ujistěte se, že **ErgData** nebo jiná aplikace na mobilu není k PM5 v tu chvíli připojená. PM5 podporuje pouze **jedno aktivní Bluetooth spojení naráz**.
4. Ve webové aplikaci klikněte na tlačítko **Připojit PM5**.
5. V dialogovém okně prohlížeče vyberte váš PM5 a potvrďte spárování.
6. Začněte veslovat – hodnoty se budou v reálném čase aktualizovat!

---

## 🎮 Režim demo simulace

Pokud zrovna nesedíte u trenažéru a chcete ladit herní mechaniky nebo grafiku:
- Klikněte na tlačítko **Demo simulace**.
- Aplikace začne generovat realistická data záběrů, tempa, wattů a posunu lodě.
