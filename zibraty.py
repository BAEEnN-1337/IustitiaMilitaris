#!/usr/bin/env python3
"""Перевіряє сценарії Завдання 1 і збирає людиночитні версії.

Запуск із цієї теки:  python3 zibraty.py
    1) кожен stsenarii/*.json відповідає schema.json (вбудований мінімальний валідатор,
       лише стандартна бібліотека Python);
    2) звʼязки цілі: вузли існують і досяжні, посилання на норми є в normy.json,
       id унікальні, у першому вузлі 3–4 варіанти;
    3) генерує stsenarii.md і perelik-norm.md.
Код повернення 0 — усе гаразд, 1 — є помилки (їх виведено).
"""
import json
import re
import sys
from pathlib import Path

TUT = Path(__file__).resolve().parent
POMYLKY = []


def pomylka(tekst):
    POMYLKY.append(tekst)


# ---------- мінімальний валідатор JSON Schema (підмножина, яку використовує schema.json) ----------
TYPES = {
    "object": dict, "array": list, "string": str, "boolean": bool,
    "integer": int, "null": type(None),
}


def resolve(schema, root):
    if "$ref" in schema:
        ref = schema["$ref"]
        assert ref.startswith("#/"), ref
        node = root
        for part in ref[2:].split("/"):
            node = node[part]
        return node
    return schema


def type_ok(value, t):
    if isinstance(t, list):
        return any(type_ok(value, x) for x in t)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(value, TYPES[t])


def validate(value, schema, root, path):
    schema = resolve(schema, root)
    if "type" in schema and not type_ok(value, schema["type"]):
        pomylka(f"{path}: очікувано тип {schema['type']}, маємо {type(value).__name__}")
        return
    if "enum" in schema and value not in schema["enum"]:
        pomylka(f"{path}: значення {value!r} не з переліку {schema['enum']}")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            pomylka(f"{path}: занадто короткий рядок")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            pomylka(f"{path}: {value!r} не відповідає шаблону {schema['pattern']}")
    if isinstance(value, int) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            pomylka(f"{path}: {value} < {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            pomylka(f"{path}: {value} > {schema['maximum']}")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            pomylka(f"{path}: менше {schema['minItems']} елементів")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            pomylka(f"{path}: більше {schema['maxItems']} елементів")
        if "items" in schema:
            for i, item in enumerate(value):
                validate(item, schema["items"], root, f"{path}[{i}]")
    if isinstance(value, dict):
        for req in schema.get("required", []):
            if req not in value:
                pomylka(f"{path}: немає обовʼязкового поля «{req}»")
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for k in value:
                if k not in props:
                    pomylka(f"{path}: зайве поле «{k}»")
        for k, sub in props.items():
            if k in value:
                validate(value[k], sub, root, f"{path}.{k}")


# ---------- перевірки звʼязків ----------
def perevirka_zvyazkiv(s, normy_ids, path):
    vuzly = {v["id"]: v for v in s["vuzly"]}
    if len(vuzly) != len(s["vuzly"]):
        pomylka(f"{path}: повторювані id вузлів")
    if s["pochatkovyi_vuzol"] not in vuzly:
        pomylka(f"{path}: початкового вузла {s['pochatkovyi_vuzol']} немає")
        return
    start = vuzly[s["pochatkovyi_vuzol"]]
    if not 3 <= len(start["varianty"]) <= 4:
        pomylka(f"{path}: у першому вузлі має бути 3–4 варіанти, маємо {len(start['varianty'])}")
    vsi_varianty = [v["id"] for vz in s["vuzly"] for v in vz["varianty"]]
    if len(set(vsi_varianty)) != len(vsi_varianty):
        pomylka(f"{path}: повторювані id варіантів")
    rolі = [r["id"] for r in s["diiovi_osoby"]]
    if len(set(rolі)) != len(rolі):
        pomylka(f"{path}: повторювані id дійових осіб")
    if sum(1 for r in s["diiovi_osoby"] if r.get("hravets")) != 1:
        pomylka(f"{path}: має бути рівно одна роль користувача (hravets: true)")
    # досяжність
    dosiazhni, cherga = set(), [start["id"]]
    while cherga:
        v = cherga.pop()
        if v in dosiazhni:
            continue
        dosiazhni.add(v)
        for var in vuzly[v]["varianty"]:
            nxt = var["nastupnyi_vuzol"]
            if nxt is not None:
                if nxt not in vuzly:
                    pomylka(f"{path}: варіант {var['id']} веде до неіснуючого вузла {nxt}")
                else:
                    cherga.append(nxt)
    for v in vuzly:
        if v not in dosiazhni:
            pomylka(f"{path}: вузол {v} недосяжний")
    # норми
    scenario_normy = {n["id"] for n in s["normy"]}
    for n in scenario_normy:
        if n not in normy_ids:
            pomylka(f"{path}: норми {n} немає в normy.json")
    for vz in s["vuzly"]:
        for var in vz["varianty"]:
            for n in var["normy"]:
                if n not in normy_ids:
                    pomylka(f"{path}: варіант {var['id']} посилається на відсутню норму {n}")
                elif n not in scenario_normy:
                    pomylka(f"{path}: норма {n} з варіанта {var['id']} не наведена в normy сценарію")


# ---------- генерація md ----------
def bal(x):
    return f"+{x}" if x > 0 else str(x)


STATUS = {"zvireno": "звірено", "zvireno-rekomendatsiinyi": "звірено (рекомендаційний акт)", "ne-zvireno": "**не звірено**"}


def md_stsenarii(stsenarii, normy):
    nm = {n["id"]: n for n in normy["normy"]}
    out = ["# Приклади сценаріїв Завдання 1 — людиночитна версія", "",
           "**Лише приклади формату.** Як сценарії команди вони не зараховуються: дилеми команда обирає сама, а кожен її сценарій має щонайменше три етапи (у прикладах — два).", "",
           "Згенеровано з `stsenarii/*.json` скриптом `zibraty.py`. Не редагуйте цей файл руками: правки вносьте в JSON і перезбирайте.", "",
           "Усі сценарії вигадані, знеособлені й синтетичні: вони не описують реальних подій, осіб чи підрозділів. Фахову перевірку ДЗПК ще **не проведено**. Під час підготовки використано ШІ (див. поле «ШІ» в кожному сценарії).", "",
           "Бали — від −2 до +2 за трьома вимірами: доброчесність (Д), ефективність (Е), довіра (Дв). Їх не сумують в одне число і не визначають ними «правильний» варіант.", ""]
    out.append("| ID | Назва | Тема | Цінності в конфлікті | Тривалість |")
    out.append("|---|---|---|---|---|")
    for s in stsenarii:
        tsin = "; ".join(f"{t['tsinnist_a']} ↔ {t['tsinnist_b']}" for t in s["tsinnosti_v_konflikti"])
        out.append(f"| {s['id']} | {s['nazva']} | {s['tema']} | {tsin} | {s['tryvalist_khv']} хв |")
    out.append("")
    for s in stsenarii:
        out += [f"## {s['id']}. {s['nazva']}", "",
                f"Версія {s['versiia']}, редакції норм — на {s['data_stvorennia']}. Аудиторія: {', '.join(s['audytoriia'])}.", "",
                f"**Контекст.** {s['kontekst']}", "", "**Дійові особи.**", ""]
        for r in s["diiovi_osoby"]:
            mark = " — *роль користувача*" if r.get("hravets") else ""
            out.append(f"- {r['rol']}{mark}: {r['opys']}")
        out += ["", f"**Ситуація.** {s['sytuatsiia']}", "", "**Цінності в конфлікті.**", ""]
        for t in s["tsinnosti_v_konflikti"]:
            out.append(f"- {t['tsinnist_a']} ↔ {t['tsinnist_b']}. {t['poiasnennia']}")
        out.append("")
        for vz in s["vuzly"]:
            out.append(f"### Крок {vz['id']}")
            out.append("")
            if vz["tekst"]:
                out += [vz["tekst"], ""]
            out += [f"**{vz['zapytannia']}**", ""]
            for v in vz["varianty"]:
                b = v["baly"]
                nxt = f" → крок {v['nastupnyi_vuzol']}" if v["nastupnyi_vuzol"] else ""
                out += [f"**{v['id']}. {v['tekst']}**", "",
                        f"- Одразу: {v['naslidky']['odrazu']}",
                        f"- Згодом: {v['naslidky']['vidkladeni']}{nxt}",
                        f"- Бали: Д {bal(b['dobrochesnist'])}, Е {bal(b['efektyvnist'])}, Дв {bal(b['dovira'])}. {v['chomu_taki_baly']}",
                        f"- Зворотний звʼязок: {v['zvorotnyi_zviazok']}",
                        f"- Норми: {', '.join(v['normy']) if v['normy'] else '—'}", ""]
        out += ["**Застосовні норми.**", ""]
        for n in s["normy"]:
            nn = nm[n["id"]]
            out.append(f"- `{n['id']}` — {nn['akt']}, {nn['punkt']} ({nn['redaktsiia']}; {STATUS[nn['status_zvirky']]}). {n['yak_zastosovuietsia']}")
        out += ["", f"**На кого поширюється.** {s['zastosovnist']}", "", "**Поради.**", ""]
        out += [f"- {p}" for p in s["porady"]]
        out += ["", "**Питання для обговорення в груповому режимі.**", ""]
        out += [f"- {p}" for p in s["pytannia_dlia_obhovorennia"]]
        pz = s["perevirka_zmistu"]
        out += ["", f"**Джерело випадку:** {s['dzherelo_vypadku']['typ']}. {s['dzherelo_vypadku']['opys']}",
                f"**Перегляд фахівцем ДЗПК:** {pz['fakhivets_dzpk']}. {pz['prymitka']}",
                f"**ШІ:** {'так' if s['shi']['vykorystano'] else 'ні'} ({s['shi']['instrument']}). {s['shi']['shcho_zrobleno']} Перевірка людиною: {s['shi']['perevirka_liudynoiu']}", ""]
    return "\n".join(out)


def md_normy(stsenarii, normy):
    vykor = {}
    for s in stsenarii:
        for n in s["normy"]:
            vykor.setdefault(n["id"], []).append(s["id"])
    out = ["# Перелік норм для Завдання 1", "",
           f"Стан на {normy['data_stanu']}. Згенеровано з `normy.json` скриптом `zibraty.py`.", "",
           normy["prymitka"], "",
           "Статуси: **звірено** — текст звірено з першоджерелом і встановлено редакцію; **звірено (рекомендаційний акт)** — текст звірено, але акт не містить норм права; **не звірено** — першоджерело перевірити не вдалося, у сценаріях як певна норма не використовується.", "",
           "| ID | Акт | Пункт | Редакція | Статус | Сценарії |", "|---|---|---|---|---|---|"]
    for n in normy["normy"]:
        out.append(f"| `{n['id']}` | [{n['akt']}]({n['posylannia']}) | {n['punkt']} | {n['redaktsiia']} | {STATUS[n['status_zvirky']]} | {', '.join(vykor.get(n['id'], [])) or '—'} |")
    out += ["", "## Зміст і цитати", ""]
    for n in normy["normy"]:
        out += [f"### `{n['id']}` — {n['punkt']}", "", f"{n['akt']}. Редакція: {n['redaktsiia']}.", "", n["korotko"], ""]
        for q in n["tsytaty"]:
            out.append(f"> «{q}»")
            out.append("")
        out += [f"Джерело звірки: {n['dzherelo_zvirky']} ({n['data_zvirky']}). Посилання: {n['posylannia']}", ""]
    return "\n".join(out)


def main():
    schema = json.loads((TUT / "schema.json").read_text(encoding="utf-8"))
    normy = json.loads((TUT / "normy.json").read_text(encoding="utf-8"))
    normy_ids = [n["id"] for n in normy["normy"]]
    if len(set(normy_ids)) != len(normy_ids):
        pomylka("normy.json: повторювані id")
    for n in normy["normy"]:
        if n["status_zvirky"] != "ne-zvireno" and not n["tsytaty"]:
            pomylka(f"normy.json: {n['id']} позначено звіреним, але без цитати")
    fajly = sorted((TUT / "stsenarii").glob("*.json"))
    stsenarii = []
    for f in fajly:
        s = json.loads(f.read_text(encoding="utf-8"))
        validate(s, schema, schema, f.name)
        perevirka_zvyazkiv(s, set(normy_ids), f.name)
        if not f.name.startswith(s.get("id", "?") + "-"):
            pomylka(f"{f.name}: імʼя файла має починатися з id сценарію")
        stsenarii.append(s)
    ids = [s["id"] for s in stsenarii]
    if len(set(ids)) != len(ids):
        pomylka("повторювані id сценаріїв")
    if POMYLKY:
        print("ПОМИЛКИ:")
        for p in POMYLKY:
            print("  -", p)
        return 1
    (TUT / "stsenarii.md").write_text(md_stsenarii(stsenarii, normy) + "\n", encoding="utf-8")
    (TUT / "perelik-norm.md").write_text(md_normy(stsenarii, normy) + "\n", encoding="utf-8")
    vuzliv = sum(len(s["vuzly"]) for s in stsenarii)
    variantiv = sum(len(v["varianty"]) for s in stsenarii for v in s["vuzly"])
    print(f"OK: сценаріїв {len(stsenarii)}, вузлів {vuzliv}, варіантів {variantiv}, норм у переліку {len(normy_ids)}.")
    print("Згенеровано stsenarii.md і perelik-norm.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
