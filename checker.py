"""Проверка сервисов для status.maslahat.ai (канвас v2, «Статус сервисов»).

Запускается СНАРУЖИ нашей инфраструктуры (GitHub Actions по расписанию, см. status/README.md):
стейдж и прод выходят в интернет через один адрес, поэтому страница на наших машинах
падала бы вместе с продом. Только стандартная библиотека.

    python status/checker.py --out site/    # пишет site/status.json и site/history.json

Сутки в истории: сколько проверок, сколько неудач и медленных ответов. Цвет полоски дня:
сбой — 3+ неудачи (≈15 мин при запуске раз в 5 мин), задержки — 1–2 неудачи или >10 %
медленных, иначе норма.
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

DAYS = 90
SLOW_SEC = 3.0
# Чужие сервисы (Eskiz, Payme, Click) проверяем из-за границы (GitHub) — дорога туда длиннее.
SLOW_EXT_SEC = 8.0
UA = "maslahat-status/1.0 (+https://status.maslahat.ai)"

# id, url, заголовки. Доступен = ответ быстрее 15 с без 5xx (для чужих сервисов 4xx — тоже «жив»).
CHECKS = {
    "chat": ("https://maslahat.ai/api/v1/subscription/plans", {}, True),   # API + база
    "docs": ("https://maslahat.ai/api/v1/subscription/plans", {}, True),   # тот же бэкенд
    "voice": ("https://maslahat.ai/api/v1/health", {}, True),
    "sms": ("https://notify.eskiz.uz/api", {}, False),
    "payme": ("https://checkout.paycom.uz", {}, False),
    "click": ("https://my.click.uz", {}, False),
    "site": ("https://maslahat.ai/", {}, True),
    "app": ("https://maslahat.ai/api/v1/app/version", {"X-Platform": "android"}, True),
}


def probe(url: str, headers: dict, strict: bool, timeout: float = 15.0) -> tuple[bool, float]:
    """(жив ли, секунды). strict — наш сервис: нужен 2xx; чужой — хватит любого ответа без 5xx."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, **headers})
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 — фиксированные https-адреса
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception:  # сеть, TLS, таймаут
        return False, time.perf_counter() - t0
    dt = time.perf_counter() - t0
    # 451 — наш гео-блок «сайт только для Узбекистана»: проверка идёт из-за границы, nginx жив.
    return (200 <= code < 300 or code == 451) if strict else code < 500, dt


def slow_limit(cid: str) -> float:
    return SLOW_SEC if CHECKS.get(cid, (None, None, True))[2] else SLOW_EXT_SEC


def day_status(d: dict) -> str | None:
    if not d or not d.get("n"):
        return None
    if d.get("f", 0) >= 3:
        return "down"
    if d.get("f", 0) > 0 or d.get("s", 0) > d["n"] * 0.1:
        return "warn"
    return "ok"


def update(history: dict, results: dict, now: datetime) -> dict:
    """Добавить результаты одного прогона в историю; дни старше 90 — выкинуть."""
    day = now.strftime("%Y-%m-%d")
    cutoff = (now - timedelta(days=DAYS - 1)).strftime("%Y-%m-%d")
    for cid, (ok, dt) in results.items():
        comp = history.setdefault(cid, {})
        d = comp.setdefault(day, {"n": 0, "f": 0, "s": 0})
        d["n"] += 1
        d["f"] += 0 if ok else 1
        d["s"] += 1 if ok and dt > slow_limit(cid) else 0
        for k in [k for k in comp if k < cutoff]:
            del comp[k]
    return history


def build_status(history: dict, results: dict, now: datetime) -> dict:
    days = [(now - timedelta(days=DAYS - 1 - i)).strftime("%Y-%m-%d") for i in range(DAYS)]
    comps = []
    for cid in CHECKS:
        comp = history.get(cid, {})
        n = sum(v["n"] for v in comp.values())
        f = sum(v["f"] for v in comp.values())
        ok, dt = results.get(cid, (True, 0.0))
        comps.append({
            "id": cid,
            "status": "down" if not ok else "warn" if dt > slow_limit(cid) else "ok",
            "uptime": round(100 * (n - f) / n, 2) if n else None,
            "days": [day_status(comp.get(d)) for d in days],
        })
    return {"updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "first_day": days[0], "components": comps}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="site")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    hist_path = os.path.join(a.out, "history.json")
    try:
        with open(hist_path, encoding="utf-8") as f:
            history = json.load(f)
    except (OSError, ValueError):
        history = {}
    now = datetime.now(timezone.utc)
    results = {cid: probe(u, h, strict) for cid, (u, h, strict) in CHECKS.items()}
    history = update(history, results, now)
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(history, f, separators=(",", ":"))
    with open(os.path.join(a.out, "status.json"), "w", encoding="utf-8") as f:
        json.dump(build_status(history, results, now), f, separators=(",", ":"))
    print(" ".join(f"{k}={'ok' if ok else 'FAIL'}:{dt:.1f}s" for k, (ok, dt) in results.items()))


if __name__ == "__main__":
    main()
