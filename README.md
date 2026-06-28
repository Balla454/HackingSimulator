# HackingSimulator

A browser-based cybersecurity education platform built with React and Electron. Students at every grade level work through hands-on labs inside a shared narrative universe — the **AEGIS Network** — guided by an AI character named PIXEL.

---

## Labs & Grade Tiers

| Tier | Audience | Role | Focus |
|---|---|---|---|
| **Security Explorer** | K–5 | Explorer Wing | Digital awareness — spot odd behavior, learn how devices talk |
| **Junior Cyber Analyst** | 6–8 | Analyst Wing | Pattern recognition — cause & effect, connected threats |
| **SOC Analyst** | 9–12 | SOC Lab | Real analyst workflow — triage alerts for a simulated healthcare client |
| **BLACK SIGNAL** | Advanced / unlocked | Campaign mode | Deeper offensive/defensive scenarios (hidden unlock) |

## Minigames

- **Password Cracker** — brute-force and dictionary attack simulation
- **Network Scanner** — live host/port discovery walkthrough
- **Cryptography Challenge** — encode, decode, break ciphers
- **Phishing Simulator** — identify and dissect phishing attempts
- **Digital Forensics** — examine artifacts and reconstruct events
- **File Decryptor** — key-based decryption puzzles
- **Firewall Breach** — rule-based intrusion scenarios
- **Malware Analyzer** — static analysis of simulated malware samples
- **Social Engineering** — recognize manipulation tactics
- **SSH Login** — terminal-based authentication lab

---

## Stack

- **React 18** + **Vite**
- **Electron** — cross-platform desktop builds (Mac, Windows, Linux)
- CSS modules per component, no UI library

## Run Locally

```bash
npm install
npm run dev        # browser dev server
```

## Build

```bash
npm run dist:mac-universal    # Mac (Intel + Apple Silicon)
npm run dist:win-all          # Windows x64 + ARM64
npm run dist:linux-all        # Linux x64 + ARM64
npm run dist:all              # everything
```

---

## Project Structure

```
src/
├── components/
│   ├── Minigames/        # individual lab modules
│   ├── SOCLab.jsx        # 9-12 SOC analyst experience
│   ├── AnalystLab.jsx    # 6-8 tier
│   ├── ExplorerLab.jsx   # K-5 tier
│   ├── Terminal.jsx      # shared terminal emulator
│   └── VaultHome.jsx     # main hub / grade picker
├── data/
│   └── aegisUniverse.js  # shared narrative, PIXEL character, tier config
└── styles/               # per-component CSS
```

---

Built as part of a broader push to make security education accessible at every grade level.
