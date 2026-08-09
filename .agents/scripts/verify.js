const fs = require('fs');
const { execSync } = require('child_process');

try {
    // Lese den JSON Payload von stdin
    const input = fs.readFileSync(0, 'utf-8');
    const payload = JSON.parse(input);

    // Führe die Prüfung nur durch, wenn der Agent stoppen möchte, 
    // um die Verifizierung vorzunehmen. (z.B. "model_stop")
    if (payload.terminationReason !== 'model_stop') {
        console.log(JSON.stringify({}));
        process.exit(0);
    }

    // Vollumfängliche Verifizierung starten (Test-Suite aufrufen)
    // Das Skript wird in .agents/ ausgeführt, daher cwd eine Ebene höher setzen:
    execSync('npm run test', { stdio: 'pipe', cwd: '..' });
    
    // Ebenfalls sicherstellen, dass die GitHub Pipeline auf grün steht
    // gh run watch blockiert solange eine Pipeline läuft und gibt != 0 zurück, falls sie failed
    execSync('gh run watch --exit-status', { stdio: 'pipe', cwd: '..' });

    // Wenn alles erfolgreich durchläuft, darf der Task beendet werden.
    console.log(JSON.stringify({}));
} catch (error) {
    // Wenn Fehler auftreten, fangen wir die Fehlerausgabe ab
    const output = error.stdout ? error.stdout.toString() : error.message;

    // Wir senden ein "continue", wodurch der Agent nicht stoppen darf.
    // Die Fehlermeldung wird ihm als Systemnachricht übergeben, damit 
    // er diese analysieren und den Code entsprechend reparieren kann!
    console.log(JSON.stringify({
        decision: "continue",
        reason: "Die vollumfängliche Verifizierung (Tests) ist fehlgeschlagen! Bitte repariere folgende Fehler, bevor du die Aufgabe beendest:\n\n" + output
    }));
}
