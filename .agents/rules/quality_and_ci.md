---
description: Enforces the Boy Scout Principle and 100% verified GitHub pipeline runs for all tasks.
trigger: always_on
---

# Quality & CI Standards

## The Boy Scout Principle
Immer das Pfadfinder-Prinzip ("Boy Scout Principle") anwenden: Hinterlasse den Code jedes Mal ein bisschen besser, als du ihn vorgefunden hast. 
- Refactore unaufgeräumten Code, wenn du ihn für ein Feature anfasst.
- Verbessere Bezeichner, lösche toten Code und aktualisiere Kommentare, die veraltet sind.
- Nutze jeden Ablauf (jede Interaktion), um die Qualität und Lesbarkeit des Codes ein kleines Stückchen zu erhöhen.

## 100% Verified GitHub Pipelines
Wenn du Code auf GitHub pushst (bzw. eine Aufgabe abschließt, die Remote-Änderungen beinhaltet), MUSS zwingend sichergestellt werden, dass die CI/CD-Pipelines auf GitHub zu 100% erfolgreich durchlaufen, bevor du deine Arbeit an der Aufgabe als "beendet" betrachtest.
- Sobald Code gepusht wurde, nutze die GitHub CLI (`gh run list` oder `gh run watch`), um den Status der Pipeline zu überwachen.
- Deine Aufgabe ist erst dann erfolgreich beendet, wenn die Pipeline komplett "green" (erfolgreich) ist.
- Sollte die Pipeline fehlschlagen, analysiere die Logs, behebe den Fehler im Code, pushe erneut und wiederhole die Überwachung, bis alles grün ist.
