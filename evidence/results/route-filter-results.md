# Ruttfilter: verifierat underlag

Datum: 2026-05-27  
Miljö: lokal backend och lokal MySQL-databas enligt rapportens befintliga testmiljö.

## Funktionstest

Kommando:

```bash
npm run test:route-filter
```

Scenario: fyra märkta testresor skapades tillfälligt. Sökradien sattes till
`0.5 km` både vid önskad startpunkt och önskad målpunkt.

| Testresa | Startavstånd | Målavstånd | Utfall |
| --- | ---: | ---: | --- |
| `MATCH_NEAREST` | 0,080 km | 0,090 km | Returnerades |
| `MATCH_SECOND` | 0,230 km | 0,310 km | Returnerades |
| `OUTSIDE_PICKUP` | 0,650 km | 0,100 km | Exkluderades |
| `OUTSIDE_DESTINATION` | 0,100 km | 0,650 km | Exkluderades |

Resultat: **GODKÄNT**. Endast resor inom båda valda radierna returnerades.
Testposterna togs bort efter körningen.

## Jämförelsetest

Kommando:

```bash
DATASET_SIZES=10000,50000,100000 RUNS=10 npm run benchmark:route-filter
DATASET_SIZES=1000000 RUNS=10 npm run benchmark:route-filter
```

Jämförelsen använder samma två radier (`0.5 km` och `0.5 km`) och samma
sorterade urval. SQL-varianten beräknar, filtrerar och sorterar i databasen.
Applikationsvarianten hämtar koordinatraderna och gör motsvarande beräkning,
filtrering och sortering i Node.js. Mätningen isolerar dessa två
beräkningsplaceringar och är inte ett fullständigt nätverks- eller
produktionsprestandatest.

| Totalt mätta rader | SQL min (ms) | SQL max (ms) | SQL medel (ms) | Applikation min (ms) | Applikation max (ms) | Applikation medel (ms) | App/SQL |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 003 | 5,73 | 6,68 | 6,11 | 6,35 | 7,90 | 7,27 | 1,19x |
| 50 003 | 26,12 | 168,70 | 41,12 | 26,16 | 99,91 | 34,52 | 0,84x |
| 100 003 | 51,49 | 57,76 | 54,17 | 50,71 | 54,99 | 53,28 | 0,98x |
| 1 000 003 | 563,56 | 612,46 | 584,55 | 583,23 | 744,61 | 638,45 | 1,09x |

Tolkning: resultaten visar ingen stabil tidsfördel vid de mindre
datamängderna. Vid det största mätta fallet hade SQL-varianten lägre
medelsvarstid än applikationsvarianten. Slutsatsen begränsas till den lokala
testmiljön.
