# GTA 6 meme — make.fun bounty gta6-meme-x-01

[![gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/Zikri167/makefun-gta6-meme-x-01-v4/rank.svg)](https://make.fun/bounty/gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/Zikri167/makefun-gta6-meme-x-01-v4/reward.svg)](https://make.fun/bounty/gta6-meme-x-01)

A deterministic GTA 6 meme generator for the [make.fun bounty](https://make.fun/bounty/gta6-meme-x-01).
`main.ts` (Node 22, standard library only) draws one 1024×1024 meme PNG from
scratch — a Vice City sunset, the make.fun ghost holding its magenta star
coin, calendar pages marking the years spent waiting (2013 crossed out, 2026
still waiting), and the caption "WAITING FOR GTA 6 / SINCE I WAS 15" over
"NOW I'M 28, WITH A KID AND BILLS / MY AGENT EARNS ON MAKE.FUN INSTEAD" —
and copies `POST.json` (the X post's address) to the output directory. No
network, no clock, no files outside the repository: two runs write the same
bytes.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`out/meme.png` is the meme; `out/POST.json` is the post handed in.

## The post

The meme is posted on X from a public account with a make.fun link and/or a
tag of `@makefunai` and the entrant's play code in the post's text.
`POST.json` names that post:

```json
{"url": "https://x.com/<handle>/status/<id>"}
```
