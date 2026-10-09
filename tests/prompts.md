# Parser test cases

Expected output of the parser (SPEC §4.1) **before** defaults are filled. `null` = "not stated, fill from prefs/clock".
Fields not listed are default: `people 1, hunger "normal", urgency "normal", max_distance_km null, cravings [], avoid [], chains [], time_context null`.
A case passes if `budget`, `people`, `hunger`, `urgency`, `avoid` match exactly and `cravings`/`chains` contain the expected words.

| # | Type | Request | Expected |
|---|---|---|---|
| 1 | tight + urgent | ₱150 lang, gutom na gutom, ayoko ng matagal, malapit lang | `{"budget":150,"hunger":"high","urgency":"high","max_distance_km":1}` |
| 2 | tight + urgent | 100 pesos lang, may klase ako in 20 mins | `{"budget":100,"urgency":"high"}` |
| 3 | tight + urgent | bilis lang, 80 budget, kahit ano | `{"budget":80,"urgency":"high"}` |
| 4 | tight + relaxed | ₱120 lang, chill lang di ako nagmamadali | `{"budget":120,"urgency":"low"}` |
| 5 | tight + relaxed | budget meal na sulit, 130, okay lang kahit malayo konti | `{"budget":130,"urgency":"low","max_distance_km":null}` |
| 6 | payday | sweldo na! treat ko sarili ko, 400 | `{"budget":400}` |
| 7 | payday | payday today, gusto ko ng bongga na chicken meal | `{"budget":null,"cravings":["chicken"]}` |
| 8 | group of 4 | kaming apat, 500 total, gutom lahat | `{"budget":500,"people":4,"hunger":"high"}` |
| 9 | group of 4 | 4 kami, tig-150 each, gusto ng spaghetti | `{"budget":600,"people":4,"cravings":["spaghetti"]}` |
| 10 | craving | craving ng sisig, 180 lang | `{"budget":180,"cravings":["sisig"]}` |
| 11 | craving | gusto ko ng fries at burger, mga 200 | `{"budget":200,"cravings":["fries","burger"]}` |
| 12 | avoid pork | bawal baboy, 150, gutom | `{"budget":150,"hunger":"high","avoid":["pork"]}` |
| 13 | avoid pork | no pork please, chicken or isda, 200 sa mang inasal | `{"budget":200,"avoid":["pork"],"cravings":["chicken","fish"],"chains":["mang-inasal"]}` |
| 14 | late night | 2am na, gutom, 150, kahit anong bukas pa | `{"budget":150,"hunger":"high","time_context":"late_night"}` |
| 15 | vague | gutom ako | `{"budget":null,"hunger":"high"}` |

Extra vague smoke tests (must not crash, any sane output): `ano masarap?`, `kahit ano`, `""` (empty), `asdfgh`.
