# ===================CONFIG===================
import os
import re
import json
import pandas as pd
from serpapi import GoogleSearch

SERPAPI_KEY = "86f4411ba4a3dfb0a4cee3f23e98a79e169e346baa51121199d3d698c30b4c11"


# ================== SERPAPI ==================
def serpapi_search(params):
    params["api_key"] = SERPAPI_KEY
    search = GoogleSearch(params)
    return search.get_dict()


# ================== HELPERS ==================
def extract_year(text):
    m = re.search(r"(19|20)\d{2}", str(text))
    return int(m.group()) if m else None

def infer_country(text):
    if not isinstance(text, str):
        return "Unknown"

    t = text.lower()
    mapping = {
        "USA": ["usa", "united states", "american"],
        "China": ["china", "chinese"],
        "India": ["india", "indian"],
        "Japan": ["japan"],
        "Germany": ["germany"],
        "UK": ["uk", "britain"],
        "France": ["france"],
    }

    for c, kws in mapping.items():
        if any(k in t for k in kws):
            return c
    return "Unknown"

# ================== FETCHERS ==================

def fetch_recent_tech_news(num=40, days=2):
    params = {
        "engine": "google_news",
        "q": "technology OR artificial intelligence OR semiconductor OR robotics OR defense",
        "num": num,
        "when": f"{days}d",
        "hl": "en",
        "gl": "us",
    }

    results = serpapi_search(params)
    news = results.get("news_results", []) or []

    return pd.DataFrame([
        {
            "title": n.get("title"),
            "snippet": n.get("snippet"),
            "source": (n.get("source") or {}).get("name"),
            "link": n.get("link"),
            "date": n.get("date"),
            "year": extract_year(n.get("date")),
            "country": infer_country(n.get("snippet")),
            "signal_type": "news"
        }
        for n in news
    ])


def fetch_recent_patents(num=40):
    params = {
        "engine": "google_patents",
        "q": "technology",
        "num": num,
        "sort": "new",  # most recent first
    }

    results = serpapi_search(params)
    patents = results.get("organic_results", []) or []

    return pd.DataFrame([
        {
            "title": p.get("title"),
            "snippet": p.get("snippet"),
            "link": p.get("link"),
            "publication_date": p.get("publication_date"),
            "year": extract_year(p.get("publication_date")),
            "country": infer_country(p.get("title")),
            "signal_type": "patent"
        }
        for p in patents
    ])


# ================== ANALYTICS ==================
def trend_by_year(df):
    if df.empty:
        return []
    return (
        df.dropna(subset=["year"])
          .groupby("year")
          .size()
          .reset_index(name="count")
          .to_dict(orient="records")
    )

# ================== PIPELINE ==================
def run_global_pulse():
    print("Running Global Tech Pulse pipeline...")

    news_df = fetch_recent_tech_news()
    patents_df = fetch_recent_patents()

    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "summary": {
            "news_count": len(news_df),
            "patent_count": len(patents_df),
        },
        "trends": {
            "news_by_year": trend_by_year(news_df),
            "patents_by_year": trend_by_year(patents_df),
        },
        "entities": {
            "news": news_df.to_dict(orient="records"),
            "patents": patents_df.to_dict(orient="records"),
        }
    }

# ================== EXPORT ==================
def export_global_pulse_json():
    result = run_global_pulse()

    os.makedirs("data/global", exist_ok=True)
    path = "data/global/global_tech_pulse.json"

    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Global tech pulse written to {path}")

# ================== ENTRY ==================
if __name__ == "__main__":
    export_global_pulse_json()