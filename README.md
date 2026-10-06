# Project Haunt Online

FPS 3D nel browser per computer, iPhone e Android, con comandi touch in orizzontale. Versione 0.4: allenamento con un bot medio, 1 contro 1, 2 contro 2, tutti contro tutti.

## Giocare con gli amici

Apri il link del servizio. Una persona crea una stanza, comunica il codice agli amici; gli altri inseriscono quel codice e premono Entra. Tutti premono Sono pronto e chi ha creato la stanza preme Avvia partita. Il 2 contro 2 richiede quattro persone: squadre bilanciate blu e rossa, fuoco amico disabilitato. Chi crea la stanza deve tenere aperto il gioco: ospita la simulazione e, quando esce, termina la partita.

## Render

Servizio Web Node, piano Free. Installazione: `npm ci && tar -xzf client.tar.gz`. Avvio: `npm start`. Health check: `/health`. Il processo usa `PORT` assegnata da Render. HTTP e WebSocket condividono lo stesso servizio, senza configurazioni di porte sui dispositivi degli amici.

`client.tar.gz` contiene la versione Unity compilata e compressa per il browser. Il server invia gli asset con i corretti tipi MIME e la compressione gzip. Per aggiornare il gioco, sostituire l'archivio e ridistribuire. Il progetto Unity modificabile è conservato separatamente sul Mac.

## Verifiche e limiti

Test del relay: `npm test`. Capacità massima stanza: 4. Codici stanza temporanei e casuali. Non sono account né partite salvate. Un riavvio del servizio interrompe le stanze. La versione mobile richiede un browser moderno con WebGL 2; prestazioni e memoria dipendono dal telefono. La verifica su dispositivi fisici iPhone/Android resta da eseguire.

Audio e attribuzioni: vedi CREDITS.md. Nessun pagamento in-app, nessun servizio a pagamento configurato.
