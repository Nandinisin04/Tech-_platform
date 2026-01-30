# ml/run_pipeline.py

import os
import re
import sys
import json
import pandas as pd
import numpy as np
from serpapi import GoogleSearch
import networkx as nx


# ================== CONFIG ==================

SERPAPI_KEY = "86f4411ba4a3dfb0a4cee3f23e98a79e169e346baa51121199d3d698c30b4c11"


# ================== SERPAPI ==================

def serpapi_search(params):
    params["api_key"] = SERPAPI_KEY
    search = GoogleSearch(params)
    return search.get_dict()


# ================== HELPERS ==================

def tech_slug(tech: str) -> str:
    return tech.lower().replace(" ", "_")


def clean_df(df: pd.DataFrame, subset):
    if df is None or df.empty:
        return pd.DataFrame()
    return df.drop_duplicates(subset=subset)


def extract_year_from_text(text):
    m = re.search(r"(19|20)\d{2}", str(text))
    return int(m.group()) if m else None


# ================== MARKET PARSERS ==================

def extract_market_size(text):
    m = re.search(
        r"(\$?\s*\d[\d\.,]*\s*(billion|million|trillion|bn|mn|b|m|t))",
        str(text),
        re.I,
    )
    return m.group(1) if m else None


def extract_cagr(text):
    m = re.search(r"(\d+(\.\d+)?)\s*%\s*(?:cagr|compound annual growth)", str(text), re.I)
    return m.group(1) + "%" if m else None


def extract_forecast_years(text):
    m = re.search(r"(20\d{2}).{0,15}(20\d{2})", str(text))
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None

def extract_regions(text: str):
    text = str(text).lower()
    regions = ["north america", "europe", "asia-pacific", "apac", "china", "india",
               "japan", "middle east", "latin america", "usa", "uk"]
    return [r for r in regions if r in text]

# ================== FETCHERS ==================

def fetch_patents(tech, num=20):
    params = {"engine": "google_patents", "q": tech, "num": num}
    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    return pd.DataFrame([
        {
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "publication_date": r.get("publication_date"),
            "filing_date": r.get("filing_date"),
            "priority_date": r.get("priority_date"),
            "technology" : tech ##change
        }
        for r in organic
    ])


def fetch_papers(tech, num=20):
    params = {"engine": "google_scholar", "q": tech, "num": num}
    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    return pd.DataFrame([
        {
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "year": (r.get("publication_info") or {}).get("year"),
            "authors":(r.get("publication_info") or {}).get("authors"),
            "technology": tech
        }
        for r in organic
    ])


def fetch_companies(tech, num=10):
    params = {"engine": "google", "q": f"top companies working on {tech}", "num": num}
    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    return pd.DataFrame([
        {
            "name": r.get("title"),
            "description": r.get("snippet"),
            "link":r.get("link"),
        }
        for r in organic
    ])

def fetch_funding(tech, num=10):
    params = {
        "engine": "google",
        "q": f"{tech} funding government investment VC R&D",
        "num": num
    }
    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    data = []
    for i, r in enumerate(organic, start=1):
        data.append({
            "id": i,
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "technology": tech
        })
    return pd.DataFrame(data)

def fetch_market(tech, num=10):
    params = {"engine": "google", "q": f"{tech} market size CAGR forecast 2030", "num": num}
    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    return pd.DataFrame([
        {
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link":r.get("link"),
            "technology": tech
        }
        for r in organic
    ])

def infer_country_from_text(text):
    if not isinstance(text, str):
        return "Unknown"

    text = text.lower()

    country_keywords = {
        "united states": ["usa", "united states", "us-based", "american"],
        "china": ["china", "chinese"],
        "india": ["india", "indian"],
        "japan": ["japan", "japanese"],
        "germany": ["germany", "german"],
        "france": ["france", "french"],
        "uk": ["uk", "united kingdom", "british"],
        "south korea": ["korea", "south korea"],
        "israel": ["israel", "israeli"]
    }

    for country, keywords in country_keywords.items():
        for kw in keywords:
            if kw in text:
                return country.title()

    return "Unknown"

# ================== ENRICHMENT ==================

def extract_patent_country(link):
    if not isinstance(link, str):
        return None
    m = re.search(r"/patent/([A-Z]{2})", link)
    if m:
        code = m.group(1)
        mapping = {"US": "USA", "EP": "Europe", "WO": "WIPO", "CN": "China",
                   "JP": "Japan", "KR": "South Korea", "IN": "India"}
        return mapping.get(code, code)
    return None

# Rough country from domain
def extract_country_from_domain(link):
    if not isinstance(link, str):
        return None
    link = link.lower()
    if ".edu" in link: return "USA"
    if ".ac.uk" in link or ".uk" in link: return "UK"
    if ".cn" in link: return "China"
    if ".in" in link: return "India"
    if ".de" in link: return "Germany"
    if ".jp" in link: return "Japan"
    if ".fr" in link: return "France"
    return None

def add_patent_year_country(df):
    if df.empty:
        return df
    df = df.copy()

    def year_from_row(row):
        for d in [row.get("publication_date"), row.get("filing_date"), row.get("priority_date")]:
            if isinstance(d, str) and len(d) >= 4 and d[:4].isdigit():
                return int(d[:4])
        return extract_year_from_text(row.get("snippet")) or extract_year_from_text(row.get("title"))

    df["year"] = df.apply(year_from_row, axis=1)
    df["country"] = df["link"].apply(extract_patent_country)
    df["country"] = (df["country"].fillna("Unknown").astype(str))
    df["country"] = df["title"].apply(infer_country_from_text)

    return df

def add_paper_year_country(df):
    if df.empty:
        return df
    df = df.copy()
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["year"] = df["year"].fillna(df["snippet"].apply(extract_year_from_text))
    df["year"] = df["year"].fillna(df["title"].apply(extract_year_from_text))
    df["country"] = df["link"].apply(extract_country_from_domain)
    return df

def add_company_country(df):
    if df.empty:
        return df
    df = df.copy()
    df["country"] = df["link"].apply(extract_country_from_domain)
    df["country"] = (df["country"].fillna("Unknown").astype(str))
    df["country"] = df.apply(lambda row: infer_country_from_text(f"{row.get('company_name','')} {row.get('description','')}"),axis=1)

    return df

def add_year_from_snippet(df):
    if df.empty:
        return df
    df = df.copy()
    df["year"] = df["snippet"].apply(extract_year_from_text)
    return df

# ---- TRL ----
TRL_MAP = {
    9: ["mission proven", "flight test", "operational system"],
    8: ["qualified", "completed system"],
    7: ["system prototype", "operational environment"],
    6: ["prototype", "demonstrated"],
    5: ["validated", "tested"],
    4: ["lab testing", "laboratory validation"],
    3: ["proof of concept"],
    2: ["concept", "modeling", "simulation"],
    1: ["theoretical", "hypothesis"],
}

def estimate_trl(text):
    t = str(text).lower()
    for trl, keywords in TRL_MAP.items():
        for kw in keywords:
            if kw in t:
                return trl
    return 2  # default early-stage

def add_trl(df):
    if df.empty:
        return df
    df = df.copy()
    df["trl"] = df["snippet"].apply(estimate_trl)
    return df

# ================== ANALYTICS ==================

def compute_trend_by_year(df):
    if df.empty or "year" not in df.columns:
        return pd.DataFrame(columns=["year", "count"])
    temp = df.dropna(subset=["year"]).copy()
    if temp.empty:
        return pd.DataFrame(columns=["year", "count"])
    temp["year"] = temp["year"].astype(int)
    return temp.groupby("year").size().reset_index(name="count")

def compute_trend_by_country_year(df):
    if df.empty or "year" not in df.columns or "country" not in df.columns:
        return pd.DataFrame(columns=["country", "year", "count"])
    temp = df.dropna(subset=["year"]).copy()
    temp["year"] = temp["year"].astype(int)
    temp["country"] = temp["country"].fillna("Unknown")
    return temp.groupby(["country", "year"]).size().reset_index(name="count")

# ---- market analytics ----
def process_market(df):
    if df.empty:
        return df
    df = df.copy()
    df["market_size"] = df["snippet"].apply(extract_market_size)
    df["cagr"] = df["snippet"].apply(extract_cagr)
    starts, ends = zip(*df["snippet"].apply(extract_forecast_years))
    df["forecast_start"] = starts
    df["forecast_end"] = ends
    df["regions"] = df["snippet"].apply(lambda x: ", ".join(extract_regions(x)))
    return df

# convert "$6.5 billion" to numeric billions
def parse_size_to_billions(s):
    if not isinstance(s, str):
        return None
    s = s.lower().replace("$", "").replace("usd", "").strip()
    m = re.search(r"([\d\.]+)", s)
    if not m:
        return None
    val = float(m.group(1))
    if "trillion" in s or "tn" in s or "t " in s:
        return val * 1000
    if "million" in s or "mn" in s or " m" in s:
        return val / 1000.0
    # assume billion or bn or nothing
    return val

def parse_cagr_percent(s):
    if not isinstance(s, str):
        return None
    m = re.search(r"([\d\.]+)", s)
    return float(m.group(1)) if m else None

def build_market_forecast_series(row):
    base = parse_size_to_billions(row.get("market_size"))
    cagr = parse_cagr_percent(row.get("cagr"))

    start = row.get("forecast_start")
    end = row.get("forecast_end")

    # Basic availability check
    if base is None or cagr is None:
        return None

    # Reject null, nan, blanks
    if start is None or end is None:
        return None
    if isinstance(start, float) and (np.isnan(start) or start.is_integer() is False):
        start = int(start) if not np.isnan(start) else None
    if isinstance(end, float) and (np.isnan(end) or end.is_integer() is False):
        end = int(end) if not np.isnan(end) else None

    # Reject invalid
    if start is None or end is None:
        return None

    # *** FIX: Convert safely to integer ***
    try:
        start = int(float(start))
        end = int(float(end))
    except:
        return None

    # Sanity check
    if start < 1990 or end > 2045 or start > end:
        return None

    # Now generate forecast safely
    years = list(range(start, end + 1))
    growth = 1 + (cagr / 100.0)
    values = [base * (growth ** (i - start)) for i in years]

    return {"years": years, "billions": values}


# ---- S-curve & hype score (simple heuristic) ----
def compute_s_curve(trend_year_df):
    """Return maturity_score [0,1] and per-year adoption curve."""
    if trend_year_df.empty:
        return 0.0, pd.DataFrame()
    df = trend_year_df.sort_values("year").copy()
    df["cum"] = df["count"].cumsum()
    total = df["cum"].iloc[-1]
    if total == 0:
        return 0.0, df
    df["adoption"] = df["cum"] / total
    maturity = float(df["adoption"].iloc[-1])  # between 0 and 1
    return maturity, df

def classify_hype_stage(patent_trend, paper_trend, funding_trend):
    """
    Very rough heuristic:
    - if all trends very early -> Innovation Trigger
    - if sharp recent rise -> Peak of Hype
    - if drop after peak -> Trough
    - if stabilizing & growing -> Slope
    - if flat high -> Plateau
    """
    def last_growth(df):
        if df.empty or len(df) < 2: return 0.0
        df = df.sort_values("year")
        counts = df["count"].values
        if len(counts) < 2: return 0.0
        return (counts[-1] - counts[-2]) / max(1, counts[-2])

    gp = last_growth(patent_trend)
    gr = last_growth(paper_trend)
    gf = last_growth(funding_trend)

    avg_g = (gp + gr + gf) / 3.0

    if patent_trend.empty and paper_trend.empty:
        return "No Data"

    total_pat = patent_trend["count"].sum() if not patent_trend.empty else 0
    total_pap = paper_trend["count"].sum() if not paper_trend.empty else 0

    if total_pat + total_pap < 5:
        return "Innovation Trigger"
    if avg_g > 0.5:
        return "Peak of Hype"
    if avg_g < -0.3:
        return "Trough of Disillusionment"
    if 0.0 <= avg_g <= 0.5:
        return "Slope of Enlightenment"
    return "Plateau of Productivity"
def safe_str(x):
    if x is None:
        return None
    if isinstance(x, float) and pd.isna(x):
        return None
    return str(x).strip()


def build_knowledge_graph(result: dict, tech_name: str):
    G = nx.Graph()

    G.add_node(tech_name, type="technology")

    # -------- PATENTS --------
    for _, row in result.get("patents", pd.DataFrame()).iterrows():
        patent = safe_str(row.get("title"))
        country = safe_str(row.get("country"))

        if patent:
            G.add_node(patent, type="patent")
            G.add_edge(tech_name, patent, relation="HAS_PATENT")

            if country:
                G.add_node(country, type="country")
                G.add_edge(patent, country, relation="FILED_IN")

    # -------- PAPERS --------
    for _, row in result.get("papers", pd.DataFrame()).iterrows():
        paper = safe_str(row.get("title"))
        country = safe_str(row.get("country"))

        if paper:
            G.add_node(paper, type="paper")
            G.add_edge(tech_name, paper, relation="HAS_PAPER")

            if country:
                G.add_node(country, type="country")
                G.add_edge(paper, country, relation="PUBLISHED_IN")

    # -------- COMPANIES --------
    for _, row in result.get("companies", pd.DataFrame()).iterrows():
        company = safe_str(row.get("name"))
        country = safe_str(row.get("country"))

        if company:
            G.add_node(company, type="company")
            G.add_edge(tech_name, company, relation="INVOLVES_COMPANY")

            if country:
                G.add_node(country, type="country")
                G.add_edge(company, country, relation="LOCATED_IN")

    return G



def serialize_knowledge_graph(G):
    """
    Converts NetworkX graph into frontend-ready JSON
    """
    nodes = []
    edges = []

    for node, attrs in G.nodes(data=True):
        nodes.append({
            "id": str(node),
            "type": attrs.get("type", "unknown")
        })

    for src, tgt, attrs in G.edges(data=True):
        edges.append({
            "source": str(src),
            "target": str(tgt),
            "relation": attrs.get("relation", "RELATED_TO")
        })

    return {
        "nodes": nodes,
        "edges": edges
    }
 
# ================== PIPELINE ==================

def run_pipeline_for_tech(tech: str):
    print(f"Running pipeline for: {tech}")

    try:
        # ================== 1. FETCH ==================
        patents_df   = clean_df(pd.DataFrame(fetch_patents(tech)), ["title"])
        papers_df    = clean_df(pd.DataFrame(fetch_papers(tech)),  ["title"])
        companies_df = clean_df(pd.DataFrame(fetch_companies(tech)), ["name"])
        funding_df   = clean_df(pd.DataFrame(fetch_funding(tech)), ["title"])
        market_df    = clean_df(pd.DataFrame(fetch_market(tech)),  ["title"])

        # ================== 2. ENRICH ==================
        patents_df   = add_trl(add_patent_year_country(patents_df))
        papers_df    = add_trl(add_paper_year_country(papers_df))
        companies_df = add_company_country(companies_df)
        funding_df   = add_year_from_snippet(funding_df)
        market_df    = process_market(add_year_from_snippet(market_df))

        # ================== 3. TRENDS ==================
        trend_patents_year  = compute_trend_by_year(patents_df)
        trend_papers_year   = compute_trend_by_year(papers_df)
        trend_funding_year  = compute_trend_by_year(funding_df)
        trend_market_year   = compute_trend_by_year(market_df)

        trend_patents_country = compute_trend_by_country_year(patents_df)
        trend_papers_country  = compute_trend_by_country_year(papers_df)

        # ================== 4. MARKET FORECAST ==================
        market_forecast = None
        for _, row in market_df.iterrows():
            series = build_market_forecast_series(row)
            if series:
                market_forecast = series
                break

        # ================== 5. S-CURVE + HYPE ==================
        maturity_score, adoption_curve = compute_s_curve(trend_patents_year)
        hype_stage = classify_hype_stage(
            trend_patents_year,
            trend_papers_year,
            trend_funding_year,
        )
        
        G = build_knowledge_graph(
            {
                "patents": patents_df,
                "papers": papers_df,
                "companies": companies_df,
            },
            tech
        )

        kg_json = serialize_knowledge_graph(G)

        # ================== ✅ FINAL RETURN ==================
        return {
            "patents": patents_df,
            "papers": papers_df,
            "companies": companies_df,
            "funding": funding_df,
            "market": market_df,

            "patents_year": trend_patents_year,
            "papers_year": trend_papers_year,
            "funding_year": trend_funding_year,
            "market_year": trend_market_year,

            "patents_country": trend_patents_country,
            "papers_country": trend_papers_country,

            "market_forecast": market_forecast,
            "maturity_score": maturity_score,
            "adoption_curve": adoption_curve,
            "hype_stage": hype_stage,
            "knowledge_graph": kg_json,
        }

    except Exception as e:
        print(f" Pipeline failed for {tech}: {e}")

        # ✅ GUARANTEED SAFE FALLBACK
        return {
            "patents": pd.DataFrame(),
            "papers": pd.DataFrame(),
            "companies": pd.DataFrame(),
            "funding": pd.DataFrame(),
            "market": pd.DataFrame(),

            "patents_year": pd.DataFrame(),
            "papers_year": pd.DataFrame(),
            "funding_year": pd.DataFrame(),
            "market_year": pd.DataFrame(),

            "patents_country": pd.DataFrame(),
            "papers_country": pd.DataFrame(),

            "market_forecast": None,
            "maturity_score": 0,
            "adoption_curve": [],
            "hype_stage": "Unknown",
        }
        
        




#-----investment------
def compute_relative_investment_index(result):
    import pandas as pd

    # ---------- Patent signal ----------
    if (
        "trend_patents_country" in result
        and isinstance(result["trend_patents_country"], pd.DataFrame)
        and not result["trend_patents_country"].empty
    ):
        patent_signal = (
            result["trend_patents_country"]
            .query("country != 'Unknown'")
            .groupby("country")["count"]
            .sum()
        )
    else:
        patent_signal = pd.Series(dtype=float)

    # ---------- Publication signal ----------
    if (
        "papers" in result
        and isinstance(result["papers"], pd.DataFrame)
        and "country" in result["papers"].columns
    ):
        publication_signal = (
            result["papers"]
            .query("country != 'Unknown'")
            .groupby("country")
            .size()
        )
    else:
        publication_signal = pd.Series(dtype=float)

    # ---------- Company signal ----------
    if (
        "companies" in result
        and isinstance(result["companies"], pd.DataFrame)
        and "country" in result["companies"].columns
    ):
        company_signal = (
            result["companies"]
            .query("country != 'Unknown'")
            .groupby("country")
            .size()
        )
    else:
        company_signal = pd.Series(dtype=float)

    # ---------- Combine countries ----------
    countries = (
        set(patent_signal.index)
        | set(publication_signal.index)
        | set(company_signal.index)
    )

    if not countries:
        return {}

    # ---------- Weighted score ----------
    raw_scores = {
        country: (
            0.5 * patent_signal.get(country, 0)
            + 0.3 * publication_signal.get(country, 0)
            + 0.2 * company_signal.get(country, 0)
        )
        for country in countries
    }

    max_score = max(raw_scores.values()) or 1

    investment_index = {
        country: round((score / max_score) * 100, 2)
        for country, score in raw_scores.items()
    }

    return dict(
        sorted(investment_index.items(), key=lambda x: x[1], reverse=True)
    )
def generate_alerts(result, tech_key):
    alerts = []

    patents_trend = result.get("trend_patents_year")
    papers_trend = result.get("trend_papers_year")
    market_forecast = result.get("market_forecast")
    funding_df = result.get("funding")

    # ---------------- PATENT SURGE ----------------
    if isinstance(patents_trend, pd.DataFrame) and len(patents_trend) >= 2:
        last_row = patents_trend.iloc[-1]
        prev_row = patents_trend.iloc[-2]

        last, prev = last_row["count"], prev_row["count"]
        year = int(last_row["year"])

        if prev > 0:
            growth = (last - prev) / prev
            if growth > 0.3:
                alerts.append({
                    "type": "patent",
                    "message": f"Patent filings grew by {int(growth*100)}% in {year} ({prev} → {last})",
                    "time": "recent"
                })

    # ---------------- RESEARCH ACCELERATION ----------------
    if isinstance(papers_trend, pd.DataFrame) and len(papers_trend) >= 2:
        last_row = papers_trend.iloc[-1]
        prev_row = papers_trend.iloc[-2]

        last, prev = last_row["count"], prev_row["count"]
        year = int(last_row["year"])

        if prev > 0:
            growth = (last - prev) / prev
            if growth > 0.25:
                alerts.append({
                    "type": "tech",
                    "message": f"Research publications increased by {int(growth*100)}% in {year}",
                    "time": "recent"
                })

    # ---------------- MARKET MOMENTUM ----------------
    if market_forecast and isinstance(market_forecast, dict):
        values = market_forecast.get("billions", [])
        years = market_forecast.get("years", [])

        if len(values) >= 2:
            start_val, end_val = values[0], values[-1]
            start_year, end_year = years[0], years[-1]

            growth_pct = ((end_val - start_val) / start_val) * 100 if start_val else 0

            if growth_pct > 10:
                alerts.append({
                    "type": "market",
                    "message": f"Market projected to grow {int(growth_pct)}% ({start_year}–{end_year})",
                    "time": "forecast"
                })

    # ---------------- FUNDING / GOVERNMENT SIGNAL ----------------
    if isinstance(funding_df, pd.DataFrame) and not funding_df.empty:
        alerts.append({
            "type": "market",
            "message": f"{len(funding_df)} recent funding or investment signals detected",
            "time": "recent"
        })

        for txt in funding_df.get("snippet", []):
            t = str(txt).lower()
            if any(k in t for k in ["government", "defense", "military", "ministry"]):
                alerts.append({
                    "type": "tech",
                    "message": "Government or defense-sector involvement observed",
                    "time": "recent"
                })
                break

    # ---------------- FALLBACK (OPTION A) ----------------
    if not alerts:
        alerts.append({
            "type": "tech",
            "message": "Technology activity remains stable with no major inflection",
            "time": "current"
        })

    return alerts

# ================== JSON EXPORT ==================

def export_dashboard_json(tech: str, result: dict):
    if not isinstance(result, dict):
        raise RuntimeError(
            f"export_dashboard_json received invalid result for '{tech}': {type(result)}"
        )

    tech_key = tech.lower().replace(" ", "_")

    patents   = result.get("patents", pd.DataFrame())
    papers    = result.get("papers", pd.DataFrame())
    companies = result.get("companies", pd.DataFrame())
    market    = result.get("market", pd.DataFrame())
    trend_pat = result.get("patents_year", pd.DataFrame())
    forecast  = result.get("market_forecast")

    def safe(val):
        if isinstance(val, float):
            return None if np.isnan(val) or np.isinf(val) else val
        return val

    output = {
        "technology": tech_key,

        # ================= SUMMARY =================
        "summary": {
            "trl": (
                int(patents["trl"].mean())
                if isinstance(patents, pd.DataFrame) and "trl" in patents and not patents.empty
                else 2
            ),
            "growth_stage": result.get("hype_stage", "Unknown"),
            "market_size_billion_usd": (
                safe(max(forecast["billions"])) if forecast and "billions" in forecast else None
            ),
            "signals": int(len(patents)) if isinstance(patents, pd.DataFrame) else 0,
        },

        # ================= TRENDS =================
        "trend_curve": (
            trend_pat["count"].astype(int).tolist()
            if isinstance(trend_pat, pd.DataFrame) and not trend_pat.empty
            else []
        ),

        "country_investment": {
            "type": "relative_investment_index",
            "values": compute_relative_investment_index(result)
            if callable(globals().get("compute_relative_investment_index"))
            else {},
        },

        "patent_timeline": (
            [
                {"year": int(r["year"]), "count": int(r["count"])}
                for _, r in trend_pat.iterrows()
                if pd.notna(r.get("year")) and pd.notna(r.get("count"))
            ]
            if isinstance(trend_pat, pd.DataFrame)
            else []
        ),

        # ================= ENTITIES =================
        "entities": {
            "patents": [
                {
                    "title": r.get("title"),
                    "snippet": r.get("snippet"),
                    "link": r.get("link"),
                    "year": safe(r.get("year")),
                    "trl": safe(r.get("trl")),
                }
                for _, r in patents.iterrows()
            ] if isinstance(patents, pd.DataFrame) else [],

            "papers": [
                {
                    "title": r.get("title"),
                    "snippet": r.get("snippet"),
                    "link": r.get("link"),
                    "year": safe(r.get("year")),
                }
                for _, r in papers.iterrows()
            ] if isinstance(papers, pd.DataFrame) else [],

            "companies": [
                {
                    "name": r.get("name"),
                    "description": r.get("description"),
                    "link": r.get("link"),
                }
                for _, r in companies.iterrows()
            ] if isinstance(companies, pd.DataFrame) else [],

            "market_reports": [
                {
                    "title": r.get("title"),
                    "snippet": r.get("snippet"),
                    "market_size": safe(r.get("market_size")),
                    "cagr": safe(r.get("cagr")),
                    "forecast_start": safe(r.get("forecast_start")),
                    "forecast_end": safe(r.get("forecast_end")),
                }
                for _, r in market.iterrows()
            ] if isinstance(market, pd.DataFrame) else [],
        },

        # ================= ALERTS =================
        "alerts": generate_alerts(result, tech_key),
    }

    os.makedirs("data/tech", exist_ok=True)
    out_path = f"data/tech/{tech_key}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Dashboard JSON written: {out_path}")


def export_kg_json(tech: str, result: dict):
    if "knowledge_graph" not in result:
        print("No knowledge graph found in pipeline result")
        return

    tech_key = tech.lower().replace(" ", "_")
    kg = result["knowledge_graph"]

    os.makedirs("data/tech", exist_ok=True)
    out_path = f"data/tech/{tech_key}_kg.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(kg, f, indent=2, ensure_ascii=False)

    print(f"Knowledge Graph JSON written: {out_path}")



# ================== ENTRY ==================

if __name__ == "__main__":
    tech = sys.argv[1]
    result = run_pipeline_for_tech(tech)
    export_dashboard_json(tech, result)
    export_kg_json(tech, result)
    print(" ML pipeline completed")