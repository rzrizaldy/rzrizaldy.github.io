#!/usr/bin/env python3
"""Export Tuyul's public scoreboard to assets/tuyul.json.

Reads the private tuyul-md repo's data/equity.json and publishes only
percentages: the agentic book's daily time-weighted return (external
deposits/withdrawals removed, same method as tuyul-md's
scripts/reporting/performance.py) next to SPY and IHSG price returns.
No dollar amounts, positions or account numbers leave the private repo.

Usage: python3 scripts/sync_tuyul.py --tuyul ../tuyul-md
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import urllib.request

START_DATE = "2026-06-10"
START_VALUE = 250.0  # agentic book opening balance on go-live day
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "tuyul.json"


def yahoo_closes(symbol: str, since: str) -> dict[str, float]:
    start = int(dt.datetime.fromisoformat(since).replace(tzinfo=dt.UTC).timestamp()) - 86400
    end = int(dt.datetime.now(dt.UTC).timestamp()) + 86400
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?period1={start}&period2={end}&interval=1d"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)["chart"]["result"][0]
    closes = data["indicators"]["quote"][0]["close"]
    out = {}
    for ts, close in zip(data["timestamp"], closes):
        if close is None:
            continue
        # Jakarta and New York both close well after 00:00 UTC of the trade day.
        day = dt.datetime.fromtimestamp(ts, dt.UTC).date().isoformat()
        out[day] = float(close)
    return out


def last_on_or_before(series: dict[str, float], day: str) -> float | None:
    keys = [k for k in series if k <= day]
    return series[max(keys)] if keys else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tuyul", required=True, help="path to a tuyul-md checkout")
    args = parser.parse_args()

    rows = json.loads((pathlib.Path(args.tuyul) / "data" / "equity.json").read_text())
    rows = sorted((r for r in rows if r.get("date", "") >= START_DATE), key=lambda r: r["date"])

    ihsg = yahoo_closes("%5EJKSE", START_DATE)
    ihsg_base = last_on_or_before(ihsg, START_DATE)
    spy_base = next(float(r["spy"]) for r in rows if r.get("spy"))

    factor, previous = 1.0, START_VALUE
    series = []
    for r in rows:
        if r.get("equity") is None:
            continue
        ending = float(r["equity"])
        flow = float(((r.get("external_flows") or {}).get("equity")) or 0.0)
        if previous > 0:
            factor *= (ending - flow) / previous
        previous = ending
        point = {"date": r["date"], "tuyul": round((factor - 1) * 100, 2)}
        if r.get("spy"):
            point["spy"] = round((float(r["spy"]) / spy_base - 1) * 100, 2)
        close = last_on_or_before(ihsg, r["date"])
        if close and ihsg_base:
            point["ihsg"] = round((close / ihsg_base - 1) * 100, 2)
        series.append(point)

    latest = series[-1]
    payload = {
        "since": START_DATE,
        "as_of": latest["date"],
        "method": "Tuyul: daily time-weighted return in USD, external flows removed. SPY and IHSG: price return.",
        "latest": latest,
        "series": series,
    }
    OUT.write_text(json.dumps(payload, indent=1) + "\n")
    print(f"wrote {OUT.name}: as of {latest['date']} tuyul {latest['tuyul']}% spy {latest.get('spy')}% ihsg {latest.get('ihsg')}%")


if __name__ == "__main__":
    main()
