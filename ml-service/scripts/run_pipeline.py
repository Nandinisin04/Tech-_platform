# ml/run_pipeline.py

import os
import re
import sys
import json
import pandas as pd
import numpy as np
from serpapi import GoogleSearch
import networkx as nx
import requests
from dotenv import load_dotenv

load_dotenv()


# ================== CONFIG ==================
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")

if not SERPAPI_KEY:
    raise RuntimeError("SERPAPI_API_KEY missing")


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

    patents = []

    for r in organic:
        pub_no = (
            r.get("publication_number")
            or extract_patent_publication_number(
                r.get("link"),
                r.get("title"),
                r.get("snippet")
            )
        )

        patents.append({
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "publication_number": pub_no,
            "publication_date": r.get("publication_date"),
            "filing_date": r.get("filing_date"),
            "priority_date": r.get("priority_date"),
            "technology": tech
        })

    return pd.DataFrame(patents)
def extract_patent_publication_number(link, title=None, snippet=None):
    """
    Try extracting patent publication number from link/title/snippet.
    Example:
    https://patents.google.com/patent/US20220123456A1/en -> US20220123456A1
    """
    candidates = [link, title, snippet]

    for text in candidates:
        if not isinstance(text, str):
            continue

        # common patent number patterns
        m = re.search(r'\b([A-Z]{2}\d{6,}[A-Z]?\d?)\b', text.upper())
        if m:
            return m.group(1)

        # patents.google style path
        m2 = re.search(r'/patent/([A-Z]{2}\d+[A-Z]?\d?)', text.upper())
        if m2:
            return m2.group(1)

    return None
def extract_country_from_patent_number(pub_no):
    if not isinstance(pub_no, str):
        return None

    pub_no = pub_no.strip().upper()

    mapping = {
        "US": "United States",
        "CN": "China",
        "JP": "Japan",
        "KR": "South Korea",
        "IN": "India",
        "EP": "Europe",
        "WO": "WIPO",
        "GB": "United Kingdom",
        "DE": "Germany",
        "FR": "France",
        "CA": "Canada",
        "AU": "Australia",
        "RU": "Russia",
        "IL": "Israel",
        "SG": "Singapore",
        "NL": "Netherlands",
        "CH": "Switzerland"
    }

    prefix = pub_no[:2]
    return mapping.get(prefix, None)

def fetch_papers(tech, num=20):
    params = {
        "engine": "google_scholar",
        "q": tech,
        "num": num
    }

    results = serpapi_search(params)
    organic = results.get("organic_results", []) or []

    papers = []

    for r in organic:
        pub_info = r.get("publication_info") or {}
        resources = r.get("resources") or []

        papers.append({
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "result_id": r.get("result_id"),   # useful unique-ish id from SerpAPI
            "year": pub_info.get("year"),
            "authors": pub_info.get("authors"),
            "venue": pub_info.get("summary"),
            "citations": (
                (r.get("inline_links") or {})
                .get("cited_by", {})
                .get("total")
            ),
            "resources": resources,
            "technology": tech
        })

    return pd.DataFrame(papers)



def extract_country_from_affiliations(affiliations):
    if affiliations is None:
        return "Unknown"

    if isinstance(affiliations, list):
        text = " ".join([str(a) for a in affiliations if a])
    else:
        text = str(affiliations)

    return infer_country_from_text(text)



def enrich_papers_with_crossref(papers_df):

    enriched_rows = []

    for _, row in papers_df.iterrows():

        title = row.get("title")

        try:
            url = "https://api.crossref.org/works"
            params = {"query.title": title, "rows": 1}

            res = requests.get(url, params=params, timeout=10)
            data = res.json()

            items = data.get("message", {}).get("items", [])

            if items:
                item = items[0]

                # ---------- BASIC METADATA ----------
                row["doi"] = item.get("DOI")

                row["journal"] = (
                    item.get("container-title")[0]
                    if item.get("container-title")
                    else None
                )

                row["publisher"] = item.get("publisher")

                row["year"] = (
                    item.get("issued", {})
                    .get("date-parts", [[None]])[0][0]
                )

                row["abstract"] = item.get("abstract")

                # ---------- NEW INTEL FIELDS ----------

                # Conference / venue
                row["conference"] = (
                    item.get("container-title")[0]
                    if item.get("type") == "proceedings-article"
                    else None
                )

                # Reference count
                row["reference_count"] = item.get("reference-count")

                # Subject areas
                row["subjects"] = item.get("subject")

                # Author affiliations
                affiliations = []

                for author in item.get("author", []):
                    for aff in author.get("affiliation", []):
                        if aff.get("name"):
                            affiliations.append(aff.get("name"))

                row["affiliations"] = affiliations

                # Publication type
                row["publication_type"] = item.get("type")

        except Exception:
            pass

        enriched_rows.append(row)

    return pd.DataFrame(enriched_rows)

def enrich_from_arxiv(row):

    link = str(row.get("link", ""))

    if "arxiv.org" not in link:
        return row

    try:
        # Extract ID
        arxiv_id = link.split("/")[-1]

        url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
        res = requests.get(url, timeout=10)

        text = res.text

        abstract_match = re.search(
            r"<summary>(.*?)</summary>",
            text,
            re.S
        )

        if abstract_match:
            abstract = abstract_match.group(1).strip()
            row["abstract"] = abstract

        row["source"] = "arxiv"

    except Exception:
        pass

    return row

def enrich_from_semantic_scholar(row):

    doi = row.get("doi")
    title = row.get("title")

    try:
        # Prefer DOI search
        if doi:
            url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}"
            params = {
                "fields": "abstract,citationCount,fieldsOfStudy,openAccessPdf,authors"
            }
        else:
            # Fallback: title search
            url = "https://api.semanticscholar.org/graph/v1/paper/search"
            params = {
                "query": title,
                "limit": 1,
                "fields": "abstract,citationCount,fieldsOfStudy,openAccessPdf,authors"
            }

        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        paper = (
            data.get("data", [{}])[0]
            if "data" in data
            else data
        )

        if not row.get("abstract"):
            row["abstract"] = paper.get("abstract")

        if not row.get("citations"):
            row["citations"] = paper.get("citationCount")

        row["fields_of_study"] = paper.get("fieldsOfStudy")

        oa_pdf = paper.get("openAccessPdf", {})
        if oa_pdf:
            row["open_pdf"] = oa_pdf.get("url")

        # NEW: author affiliations / institutions if present
        authors_data = paper.get("authors", [])
        ss_affiliations = []

        for author in authors_data:
            affiliations = author.get("affiliations", [])
            if affiliations:
                ss_affiliations.extend(affiliations)

        if ss_affiliations and not row.get("affiliations"):
            row["affiliations"] = ss_affiliations

        row["source"] = "semantic_scholar"

    except Exception:
        pass

    return row

def enrich_from_openalex(row):

    doi = row.get("doi")
    title = row.get("title")

    try:
        if doi:
            url = f"https://api.openalex.org/works/doi:{doi}"
            res = requests.get(url, timeout=10)
        else:
            res = requests.get(
                "https://api.openalex.org/works",
                params={"search": title, "per-page": 1},
                timeout=10
            )

        if res.status_code != 200:
            return row

        data = res.json()

        if "results" in data:
            results = data.get("results", [])
            if not results:
                return row
            data = results[0]

        # ---------- Abstract reconstruction ----------
        inverted_index = data.get("abstract_inverted_index")

        if inverted_index and not row.get("abstract"):
            words = []
            for word, positions in inverted_index.items():
                for pos in positions:
                    words.append((pos, word))

            words_sorted = sorted(words, key=lambda x: x[0])
            abstract = " ".join([w[1] for w in words_sorted])
            row["abstract"] = abstract

        row["openalex_citations"] = data.get("cited_by_count")

        concepts = data.get("concepts", [])
        row["concepts"] = [c.get("display_name") for c in concepts[:5]]

        # NEW: institution extraction
        institutions = []

        for authorship in data.get("authorships", []):
            for inst in authorship.get("institutions", []):
                display_name = inst.get("display_name")
                country_code = inst.get("country_code")

                if display_name:
                    if country_code:
                        institutions.append(f"{display_name} ({country_code})")
                    else:
                        institutions.append(display_name)

        if institutions and not row.get("affiliations"):
            row["affiliations"] = institutions

        row["source"] = "openalex"

    except Exception:
        pass

    return row
def enrich_papers(papers_df):

    enriched_rows = []

    # ---------- STEP 1: Crossref ----------
    papers_df = enrich_papers_with_crossref(papers_df)

    for _, row in papers_df.iterrows():

        # ---------- STEP 2: arXiv ----------
        if not row.get("abstract"):
            row = enrich_from_arxiv(row)

        # ---------- STEP 3: Semantic Scholar ----------
        if not row.get("abstract"):
            row = enrich_from_semantic_scholar(row)

        # ---------- STEP 4: OpenAlex ----------
        if not row.get("abstract"):
            row = enrich_from_openalex(row)

        # ---------- STEP 5: Snippet fallback ----------
        if not row.get("abstract"):
            row["abstract"] = row.get("snippet")

        enriched_rows.append(row)

    return pd.DataFrame(enriched_rows)



######INSIGHTS FROM PAPER#######

TECH_DOMAIN_KEYWORDS = {

    "Artificial Intelligence & Machine Learning": [
        "deep learning", "neural network", "machine learning",
        "cnn", "rnn", "transformer", "computer vision",
        "reinforcement learning", "supervised learning"
    ],

    "Natural Language Processing": [
        "nlp", "language model", "bert", "gpt",
        "text classification", "sentiment analysis",
        "named entity recognition", "translation"
    ],

    "Blockchain & Web3": [
        "blockchain", "web3", "smart contract",
        "ethereum", "decentralized", "defi",
        "distributed ledger", "consensus protocol"
    ],

    "Cybersecurity & Cryptography": [
        "cryptography", "encryption", "cybersecurity",
        "post-quantum", "authentication", "secure communication",
        "zero trust", "intrusion detection"
    ],

    "Quantum Computing": [
        "quantum computing", "quantum cryptography",
        "qubits", "quantum algorithms",
        "quantum key distribution"
    ],

    "Hypersonics & Aerospace": [
        "hypersonic", "scramjet", "aerothermodynamics",
        "supersonic", "propulsion", "reentry",
        "missile", "flight dynamics"
    ],

    "Robotics & Autonomous Systems": [
        "robotics", "autonomous", "uav", "drone",
        "navigation", "path planning", "humanoid"
    ],

    "Internet of Things (IoT)": [
        "iot", "sensor network", "smart city",
        "edge devices", "connected devices"
    ],

    "Cloud Computing & Distributed Systems": [
        "cloud computing", "distributed systems",
        "microservices", "kubernetes",
        "serverless", "containerization"
    ],

    "Web Development": [
        "react", "next.js", "node.js", "frontend",
        "backend", "web application", "javascript",
        "full stack"
    ],

    "Data Science & Big Data": [
        "big data", "data mining", "data analytics",
        "predictive modeling", "data pipeline"
    ],

    "Semiconductors & Electronics": [
        "semiconductor", "vlsi", "fpga",
        "integrated circuits", "chip design"
    ],

    "Energy & Sustainability": [
        "renewable energy", "solar", "wind energy",
        "battery", "energy storage"
    ]
}
def detect_tech_domain(text):

    text = str(text).lower()

    for domain, keywords in TECH_DOMAIN_KEYWORDS.items():
        if any(k in text for k in keywords):
            return domain

    return "General Emerging Technology"


def detect_methodology(text):

    text = str(text).lower()

    if "simulation" in text:
        return "Computational simulation and modeling"

    if "experimental" in text or "prototype" in text:
        return "Experimental validation and prototyping"

    if "dataset" in text or "training" in text:
        return "Data-driven model training and evaluation"

    if "framework" in text:
        return "Framework and system architecture design"

    return "Analytical and theoretical evaluation"

def detect_defense_relevance(domain):

    defense_map = {

        "Hypersonics & Aerospace":
            "Direct military applications in missile systems, high-speed reconnaissance, and strategic strike platforms.",

        "Cybersecurity & Cryptography":
            "Critical for national cyber defense, secure communications, and intelligence infrastructure.",

        "Artificial Intelligence & Machine Learning":
            "Enables autonomous warfare systems, surveillance intelligence, and battlefield decision support.",

        "Quantum Computing":
            "Strategic implications for cryptographic disruption and secure quantum communications.",

        "Robotics & Autonomous Systems":
            "Applicable in unmanned combat vehicles, reconnaissance drones, and defense robotics.",

        "Blockchain & Web3":
            "Useful for secure defense data sharing and decentralized intelligence networks."
    }

    return defense_map.get(
        domain,
        "Moderate defense relevance depending on deployment context."
    )
def get_insight_text(row):

    return (
        row.get("abstract")
        or row.get("snippet")
        or row.get("title")
        or ""
    )

def generate_paper_insights(row):

    text = get_insight_text(row)

    domain = detect_tech_domain(text)
    methodology = detect_methodology(text)
    defense_relevance = detect_defense_relevance(domain)

    insights = {

        "summary":
            f"This publication explores advancements in {domain.lower()}, focusing on applied research, system optimization, and real-world technological deployment.",

        "objective":
            f"The study aims to investigate technical innovations and performance improvements within the field of {domain.lower()}.",

        "methodology":
            methodology,

        "key_innovation":
            "Proposes novel architectures, optimized computational techniques, or improved engineering designs to enhance system performance.",

        "tech_domain":
            domain,

        "defense_relevance":
            defense_relevance,

        "strategic_impact":
            "Potential to influence national technological capabilities, operational readiness, and strategic deterrence infrastructure.",

        "novelty_signal":
            "Represents progressive innovation contributing to ongoing global research acceleration.",

        "research_maturity":
            "Positioned between experimental validation and early-stage deployment readiness.",

        "limitations":
            "Challenges include scalability, operational cost, environmental constraints, and integration complexity."
    }

    return insights

def attach_paper_insights(papers_df):

    insights_list = []

    for _, row in papers_df.iterrows():

        try:
            insights = generate_paper_insights(row.to_dict())
        except Exception as e:
            print("Insight error:", e)
            insights = {}

        insights_list.append(insights)

    papers_df["insights"] = insights_list

    return papers_df



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
        "United States": [
            "usa", "u.s.a", "united states", "us-based", "american", "u.s."
        ],
        "China": ["china", "chinese", "beijing", "shanghai"],
        "India": ["india", "indian", "iit", "iiit", "isro", "drdo", "bengaluru", "bangalore", "delhi", "mumbai"],
        "Japan": ["japan", "japanese", "tokyo", "osaka"],
        "Germany": ["germany", "german", "berlin", "munich"],
        "France": ["france", "french", "paris"],
        "United Kingdom": ["uk", "u.k.", "united kingdom", "british", "england", "london", "oxford", "cambridge"],
        "South Korea": ["south korea", "korea", "korean", "seoul"],
        "Israel": ["israel", "israeli", "tel aviv"],
        "Canada": ["canada", "canadian", "toronto", "vancouver"],
        "Australia": ["australia", "australian", "sydney", "melbourne"],
        "Russia": ["russia", "russian", "moscow"],
        "Singapore": ["singapore", "ntu singapore", "nus singapore"],
        "Switzerland": ["switzerland", "swiss", "zurich"],
        "Netherlands": ["netherlands", "dutch", "amsterdam"],
    }

    for country, keywords in country_keywords.items():
        for kw in keywords:
            if kw in text:
                return country

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
    if any(d in link for d in [
        ".edu", ".gov", ".mil",
        ".us",
    ]):
        return "USA"

    # ---------- UK ----------
    if any(d in link for d in [
        ".ac.uk", ".uk",
    ]):
        return "UK"

    # ---------- China ----------
    if any(d in link for d in [
        ".cn", ".edu.cn", ".ac.cn",
    ]):
        return "China"

    # ---------- India ----------
    if any(d in link for d in [
        ".in", ".ac.in", ".edu.in",
        ".gov.in", ".nic.in",
    ]):
        return "India"

    # ---------- Germany ----------
    if any(d in link for d in [
        ".de", ".uni.de",
    ]):
        return "Germany"

    # ---------- France ----------
    if any(d in link for d in [
        ".fr", ".gouv.fr",
    ]):
        return "France"

    # ---------- Japan ----------
    if any(d in link for d in [
        ".jp", ".ac.jp", ".go.jp",
    ]):
        return "Japan"

    # ---------- South Korea ----------
    if any(d in link for d in [
        ".kr", ".ac.kr", ".go.kr",
    ]):
        return "South Korea"

    # ---------- Canada ----------
    if any(d in link for d in [
        ".ca", ".gc.ca",
    ]):
        return "Canada"

    # ---------- Australia ----------
    if any(d in link for d in [
        ".au", ".edu.au", ".gov.au",
    ]):
        return "Australia"

    # ---------- Russia ----------
    if any(d in link for d in [
        ".ru",
    ]):
        return "Russia"

    # ---------- Singapore ----------
    if any(d in link for d in [
        ".sg", ".edu.sg", ".gov.sg",
    ]):
        return "Singapore"

    # ---------- Israel ----------
    if any(d in link for d in [
        ".il", ".ac.il", ".gov.il",
    ]):
        return "Israel"

    # ---------- Netherlands ----------
    if any(d in link for d in [
        ".nl",
    ]):
        return "Netherlands"

    # ---------- Switzerland ----------
    if any(d in link for d in [
        ".ch",
    ]):
        return "Switzerland"

    # ---------- Sweden ----------
    if any(d in link for d in [
        ".se",
    ]):
        return "Sweden"

    # ---------- Spain ----------
    if any(d in link for d in [
        ".es",
    ]):
        return "Spain"

    return None
def add_patent_year_country(df):
    if df.empty:
        return df

    df = df.copy()

    def year_from_row(row):
        for d in [row.get("publication_date"), row.get("filing_date"), row.get("priority_date")]:
            if isinstance(d, str) and len(d) >= 4 and d[:4].isdigit():
                return int(d[:4])

        return (
            extract_year_from_text(row.get("snippet"))
            or extract_year_from_text(row.get("title"))
        )

    def patent_country_from_row(row):
        # 1. Best source = publication number
        country = extract_country_from_patent_number(row.get("publication_number"))
        if country:
            return country

        # 2. Fallback = patent link
        country = extract_patent_country(row.get("link"))
        if country and country != "Unknown":
            return country

        # 3. Weak fallback = title/snippet
        country = infer_country_from_text(
            f"{row.get('title', '')} {row.get('snippet', '')}"
        )
        if country and country != "Unknown":
            return country

        return "Unknown"

    df["year"] = df.apply(year_from_row, axis=1)
    df["country"] = df.apply(patent_country_from_row, axis=1)
    df["country"] = df["country"].fillna("Unknown").astype(str)

    return df
    def year_from_row(row):
        for d in [row.get("publication_date"), row.get("filing_date"), row.get("priority_date")]:
            if isinstance(d, str) and len(d) >= 4 and d[:4].isdigit():
                return int(d[:4])

        return (
            extract_year_from_text(row.get("snippet"))
            or extract_year_from_text(row.get("title"))
        )

    def patent_country_from_row(row):
        # 1. Try patent link
        country = extract_patent_country(row.get("link"))
        if country and country != "Unknown":
            return country

        # 2. Try title + snippet
        country = infer_country_from_text(
            f"{row.get('title', '')} {row.get('snippet', '')}"
        )
        if country and country != "Unknown":
            return country

        return "Unknown"

    df["year"] = df.apply(year_from_row, axis=1)
    df["country"] = df.apply(patent_country_from_row, axis=1)
    df["country"] = df["country"].fillna("Unknown").astype(str)

    return df

def add_paper_year_country(df):
    if df.empty:
        return df

    df = df.copy()

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["year"] = df["year"].fillna(df["snippet"].apply(extract_year_from_text))
    df["year"] = df["year"].fillna(df["title"].apply(extract_year_from_text))

    def paper_country_from_row(row):
        # 1. Best = affiliations / institutions
        country = extract_country_from_affiliations(row.get("affiliations"))
        if country and country != "Unknown":
            return country

        # 2. Domain
        country = extract_country_from_domain(row.get("link"))
        if country and country != "Unknown":
            return country

        # 3. Publisher / venue / journal
        country = infer_country_from_text(
            f"{row.get('publisher', '')} "
            f"{row.get('journal', '')} "
            f"{row.get('venue', '')} "
            f"{row.get('conference', '')}"
        )
        if country and country != "Unknown":
            return country

        # 4. Weak fallback
        country = infer_country_from_text(
            f"{row.get('title', '')} {row.get('snippet', '')}"
        )
        if country and country != "Unknown":
            return country

        return "Unknown"

    df["country"] = df.apply(paper_country_from_row, axis=1)
    df["country"] = df["country"].fillna("Unknown").astype(str)

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
    9: ["operational deployment", "in service", "live deployment"],
    8: ["commercial product", "commercial deployment", "industrial adoption"],
    7: ["field tested", "pilot study", "real-world evaluation"],

    6: ["validated prototype", "hardware prototype", "system validation"],
    5: ["experimental evaluation", "benchmark results", "performance evaluation"],
    4: ["simulation results", "experimental setup", "laboratory evaluation"],

    3: ["proof of concept", "poc", "algorithm design"],
    2: ["theoretical analysis", "conceptual framework", "proposed approach"],
    1: ["hypothesis", "idea"],
}

def estimate_trl(text):
    t = str(text).lower()
    scores = {}

    for trl, keywords in TRL_MAP.items():
        count = 0
        for kw in keywords:
            if kw in t:
                count += 1
        if count > 0:
            scores[trl] = count

    if not scores:
        return 2

    weighted = {trl: trl * count for trl, count in scores.items()}
    return max(weighted, key=weighted.get)


def add_trl(df):
    if df.empty:
        return df

    df = df.copy()

    df["trl"] = df.apply(
        lambda r: estimate_trl(
            f"{r.get('title', '')} {r.get('snippet', '')}"
        ),
        axis=1
    )
    df["trl"] = df["trl"].fillna(2)

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

import re
import networkx as nx
import pandas as pd

def normalize_country(c: str):
    if not c:
        return None
    c = c.strip()
    mapping = {
        "USA": "United States",
        "US": "United States",
        "United States of America": "United States",
        "UK": "United Kingdom",
        "UAE": "United Arab Emirates",
    }
    return mapping.get(c, c)

def safe_clean_str(x):
    if x is None:
        return None
    x = str(x).strip()
    if x == "" or x.lower() in ["none", "null", "nan"]:
        return None
    return x

def is_junk_title(text: str):
    if not text:
        return True
    t = text.lower().strip()

    junk_patterns = [
        r"\btop\s*\d+",
        r"\bstocks?\b",
        r"\bcompanies\b",
        r"\bmarket\b",
        r"\breport\b",
        r"\bforecast\b",
        r"\b202\d\b",
        r"\bbest\b",
        r"\bguide\b",
        r"\blist\b",
    ]
    if len(t) > 120:
        return True
    for pat in junk_patterns:
        if re.search(pat, t):
            return True
    return False

# ✅ similarity helpers
def tokenize(text: str):
    if not isinstance(text, str):
        return set()
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    words = [w for w in text.split() if len(w) > 3]
    stop = {
        "using","based","system","method","model","approach","analysis","study","research",
        "framework","design","performance","results","application","applications","deep",
        "learning","artificial","intelligence","machine","network"
    }
    return set([w for w in words if w not in stop])

def jaccard(a: set, b: set):
    if not a or not b:
        return 0.0
    return len(a & b) / max(1, len(a | b))


def build_knowledge_graph(result: dict, tech_name: str):
    G = nx.Graph()

    tech_name = safe_clean_str(tech_name)
    if not tech_name:
        return G

    # ✅ Technology node
    G.add_node(
        tech_name,
        type="technology",
        url=f"https://en.wikipedia.org/wiki/{tech_name.replace(' ', '_')}"
    )

    # -------- PATENTS --------
    patents_df = result.get("patents", pd.DataFrame())
    patent_titles = []

    for _, row in patents_df.iterrows():
        patent = safe_clean_str(row.get("title"))
        patent_url = safe_clean_str(row.get("link"))

        if not patent or is_junk_title(patent):
            continue

        patent_titles.append(patent)

        G.add_node(patent, type="patent", url=patent_url)
        G.add_edge(tech_name, patent, relation="HAS_PATENT")

    # -------- PAPERS --------
    papers_df = result.get("papers", pd.DataFrame())
    paper_titles = []

    for _, row in papers_df.iterrows():
        paper = safe_clean_str(row.get("title"))
        paper_url = safe_clean_str(row.get("link"))

        if not paper or is_junk_title(paper):
            continue

        paper_titles.append(paper)

        G.add_node(paper, type="paper", url=paper_url)
        G.add_edge(tech_name, paper, relation="HAS_PAPER")

    # -------- ARTICLES (misnamed as companies) --------
    articles_df = result.get("companies", pd.DataFrame())
    article_titles = []

    for _, row in articles_df.iterrows():
        article_title = safe_clean_str(row.get("name"))
        article_url = safe_clean_str(row.get("link"))

        if not article_title:
            continue

        article_titles.append(article_title)

        G.add_node(article_title, type="source_article", url=article_url)
        G.add_edge(tech_name, article_title, relation="MENTIONED_IN")

    # ✅ Limit for speed
    patent_titles = patent_titles[:25]
    paper_titles = paper_titles[:25]
    article_titles = article_titles[:15]

    # =========================================================
    # ✅ EXTRA LINKAGES (NON-STAR GRAPH)
    # =========================================================

    # 1) Paper ↔ Patent similarity
    for p in patent_titles:
        p_tok = tokenize(p)
        for r in paper_titles:
            sim = jaccard(p_tok, tokenize(r))
            if sim >= 0.18:
                G.add_edge(p, r, relation="RELATED_WORK", weight=sim)

    # 2) Paper ↔ Paper similarity
    for i in range(len(paper_titles)):
        for j in range(i + 1, len(paper_titles)):
            a, b = paper_titles[i], paper_titles[j]
            sim = jaccard(tokenize(a), tokenize(b))
            if sim >= 0.22:
                G.add_edge(a, b, relation="SIMILAR_PAPER", weight=sim)

    # 3) Patent ↔ Patent similarity
    for i in range(len(patent_titles)):
        for j in range(i + 1, len(patent_titles)):
            a, b = patent_titles[i], patent_titles[j]
            sim = jaccard(tokenize(a), tokenize(b))
            if sim >= 0.22:
                G.add_edge(a, b, relation="SIMILAR_PATENT", weight=sim)

    # 4) Article ↔ Patent/Paper mentions (keyword overlap)
    for art in article_titles:
        art_tok = tokenize(art)

        for p in patent_titles[:15]:
            if jaccard(art_tok, tokenize(p)) >= 0.12:
                G.add_edge(art, p, relation="MENTIONS_PATENT")

        for r in paper_titles[:15]:
            if jaccard(art_tok, tokenize(r)) >= 0.12:
                G.add_edge(art, r, relation="MENTIONS_PAPER")

    # 5) Countries from investment dict + connect to tech
    country_inv = result.get("country_investment", {}).get("values", {})
    if isinstance(country_inv, dict) and len(country_inv) > 0:
        for c, score in country_inv.items():
            c = normalize_country(safe_clean_str(c))
            if not c:
                continue
            G.add_node(c, type="country")
            G.add_edge(tech_name, c, relation="ACTIVE_IN", weight=float(score))

            # connect country to some items to avoid star-only view
            for p in patent_titles[:5]:
                G.add_edge(c, p, relation="COUNTRY_PATENT_SIGNAL")
            for r in paper_titles[:5]:
                G.add_edge(c, r, relation="COUNTRY_RESEARCH_SIGNAL")

    return G
def serialize_knowledge_graph(G):
    nodes = []
    edges = []

    degree_map = dict(G.degree())

    for node, attrs in G.nodes(data=True):
        nodes.append({
            "id": str(node),
            "type": attrs.get("type", "unknown"),
            "url": attrs.get("url"),
            "degree": degree_map.get(node, 0),
        })

    for src, tgt, attrs in G.edges(data=True):
        edges.append({
            "source": str(src),
            "target": str(tgt),
            "relation": attrs.get("relation", "RELATED_TO"),
            "weight": float(attrs.get("weight", 1.0)),
        })

    return {"nodes": nodes, "edges": edges}
import re
import pandas as pd

STOPWORDS = {
    "quantum", "computing", "companies", "technology",
    "systems", "machine", "learning", "ai", "best", "top",
    "here", "what", "this", "that", "these", "those",
    "leading", "current", "state"
}

KNOWN_COMPANIES = [
    "IBM", "Google", "Microsoft", "Amazon",
    "D-Wave", "IonQ", "Xanadu", "Intel", "Nvidia"
]


def enrich_companies(companies_df):

    if companies_df.empty:
        return companies_df

    extracted = {}

    for _, r in companies_df.iterrows():

        text = f"{r.get('name', '')} {r.get('description', '')}"
        link = r.get("link")
        title = r.get("name")

        # -------------------------
        # 1️⃣ Known companies (high confidence)
        # -------------------------
        for company in KNOWN_COMPANIES:
            if company.lower() in text.lower():

                if company not in extracted:
                    extracted[company] = {
                        "name": company,
                        "mentions": 0,
                        "evidence": []
                    }

                extracted[company]["mentions"] += 1

                if link and not any(e["link"] == link for e in extracted[company]["evidence"]):
                    extracted[company]["evidence"].append({
                        "title": title,
                        "link": link
                    })

        # -------------------------
        # 2️⃣ Improved entity extraction
        # (captures multi-word names like "Google AI", "Amazon Web")
        # -------------------------
        matches = re.findall(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b", text)

        for m in matches:

            name = m.strip()

            # Normalize (keep first word if it's like "Google AI")
            name = name.split()[0]

            # -------------------------
            # Filters (IMPORTANT)
            # -------------------------
            if name.lower() in STOPWORDS:
                continue

            if len(name) <= 3:
                continue

            if name in KNOWN_COMPANIES:
                continue  # already handled

            # Must appear more than once in combined text OR across dataset
            count_in_text = text.lower().count(name.lower())

            if count_in_text <= 1:
                continue

            # Skip words that are not likely orgs
            if not name[0].isupper():
                continue

            # -------------------------
            # Store
            # -------------------------
            if name not in extracted:
                extracted[name] = {
                    "name": name,
                    "mentions": 0,
                    "evidence": []
                }

            extracted[name]["mentions"] += 1

            if link and not any(e["link"] == link for e in extracted[name]["evidence"]):
                extracted[name]["evidence"].append({
                    "title": title,
                    "link": link
                })

    # -------------------------
    # 3️⃣ Ranking & cleaning
    # -------------------------
    sorted_companies = sorted(
        extracted.values(),
        key=lambda x: x["mentions"],
        reverse=True
    )

    # Keep only meaningful ones
    sorted_companies = [
        c for c in sorted_companies
        if c["mentions"] >= 2 and len(c["evidence"]) > 0
    ][:5]

    # -------------------------
    # 4️⃣ Generate insights
    # -------------------------
    result = []

    for c in sorted_companies:

        mentions = c["mentions"]

        if mentions >= 4:
            importance = "high"
            insight = f"{c['name']} appears across multiple independent sources, indicating strong ecosystem presence."
        elif mentions >= 2:
            importance = "medium"
            insight = f"{c['name']} appears in several signals, suggesting active involvement."
        else:
            importance = "low"
            insight = f"{c['name']} appears in limited signals."

        result.append({
            "name": c["name"],
            "importance": importance,
            "insight": insight,
            "implication": f"{c['name']} is likely a relevant player in this technology ecosystem.",
            "evidence": c["evidence"][:2]  # max 2 unique sources
        })

    return pd.DataFrame(result)

def run_pipeline_for_tech(tech: str):
    print(f"Running pipeline for: {tech}")

    try:
        # ================== 1. FETCH ==================
        patents_df   = clean_df(pd.DataFrame(fetch_patents(tech)), ["title"])
        papers_raw = clean_df(pd.DataFrame(fetch_papers(tech)), ["title"])
        papers_df = enrich_papers(papers_raw)
        papers_df = attach_paper_insights(papers_df)
        companies_df = clean_df(pd.DataFrame(fetch_companies(tech)), ["name"])
        funding_df   = clean_df(pd.DataFrame(fetch_funding(tech)), ["title"])
        market_df    = clean_df(pd.DataFrame(fetch_market(tech)),  ["title"])

        # ================== 2. ENRICH ==================
        patents_df   = add_trl(add_patent_year_country(patents_df))
        papers_df    = add_trl(add_paper_year_country(papers_df))
        companies_df = add_company_country(companies_df)
        companies_df = enrich_companies(companies_df)
        funding_df   = add_year_from_snippet(funding_df)
        market_df    = process_market(add_year_from_snippet(market_df))

        # ================== 3. TRENDS ==================
        trend_patents_year  = compute_trend_by_year(patents_df)
        trend_papers_year   = compute_trend_by_year(papers_df)
        trend_funding_year  = compute_trend_by_year(funding_df)
        trend_market_year   = compute_trend_by_year(market_df)
        trend_curve = build_trend_curve(trend_patents_year, trend_papers_year, trend_funding_year)

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
        country_investment = {
        "type": "relative_investment_index",
        "values": compute_relative_investment_index({
            "trend_patents_country": trend_patents_country,
            "papers": papers_df,
            "companies": companies_df
        })
    }

        
        G = build_knowledge_graph(
            {
                "patents": patents_df,
                "papers": papers_df,
                "companies": companies_df,
                "country_investment": country_investment, 
            },
            tech
        )

        kg_json = serialize_knowledge_graph(G)
        # ================== 🧠 GEMINI SUMMARY ==================
        try:
          summary_text = generate_summary(tech)
        except Exception as e:
          print("Gemini failed:", e)
          summary_text = None
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
            "country_investment": country_investment,
            "trend_curve": trend_curve,
            "summary_text":summary_text,
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
        
        
def build_trend_curve(trend_pat, trend_pap=None, trend_fund=None):
    """
    Combine year-wise signals into ONE curve.
    Output: list[int] aligned by years.
    """

    dfs = []
    if isinstance(trend_pat, pd.DataFrame) and not trend_pat.empty:
        dfs.append(trend_pat.rename(columns={"count": "patents"}))
    if isinstance(trend_pap, pd.DataFrame) and not trend_pap.empty:
        dfs.append(trend_pap.rename(columns={"count": "papers"}))
    if isinstance(trend_fund, pd.DataFrame) and not trend_fund.empty:
        dfs.append(trend_fund.rename(columns={"count": "funding"}))

    if not dfs:
        return []

    # merge on year
    merged = dfs[0]
    for d in dfs[1:]:
        merged = merged.merge(d, on="year", how="outer")

    merged = merged.fillna(0).sort_values("year")

    # weighted sum (tune as you like)
    merged["score"] = (
        0.5 * merged.get("patents", 0)
        + 0.3 * merged.get("papers", 0)
        + 0.2 * merged.get("funding", 0)
    )

    # convert to int curve
    return merged["score"].round().astype(int).tolist()

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


#-----investment------
# ===============================
# Country normalization map
# ===============================
COUNTRY_NORMALIZATION = {
    "us": "USA",
    "usa": "USA",
    "united states": "USA",
    "united states of america": "USA",

    "uk": "UK",
    "united kingdom": "UK",
    "great britain": "UK",

    "peoples republic of china": "China",
    "prc": "China",
    "china": "China",

    "republic of korea": "South Korea",
    "south korea": "South Korea",
    "korea": "South Korea",

    "russian federation": "Russia",
    "russia": "Russia"
}


# ===============================
# Main computation function
# ===============================
def compute_relative_investment_index(result, TOP_N=5):
    import pandas as pd
    import numpy as np

    # ---------- helpers ----------
    def log_safe(x):
        return np.log1p(x)

    def normalize_country(country):
        if not isinstance(country, str):
            return "Unknown"
        c = country.strip().lower()
        return COUNTRY_NORMALIZATION.get(c, country.title())

    # ---------- Patent signal ----------
    if (
        "trend_patents_country" in result
        and isinstance(result["trend_patents_country"], pd.DataFrame)
        and not result["trend_patents_country"].empty
    ):
        pat_df = result["trend_patents_country"].copy()
        pat_df["country"] = pat_df["country"].apply(normalize_country)

        patent_signal = (
            pat_df
            .query("country != 'Unknown'")
            .groupby("country")["count"]
            .sum()
            .apply(log_safe)
        )
    else:
        patent_signal = pd.Series(dtype=float)

    # ---------- Publication signal ----------
    if (
        "papers" in result
        and isinstance(result["papers"], pd.DataFrame)
        and "country" in result["papers"].columns
    ):
        pap_df = result["papers"].copy()
        pap_df["country"] = pap_df["country"].apply(normalize_country)

        publication_signal = (
            pap_df
            .query("country != 'Unknown'")
            .groupby("country")
            .size()
            .apply(log_safe)
        )
    else:
        publication_signal = pd.Series(dtype=float)

    # ---------- Company signal ----------
    if (
        "companies" in result
        and isinstance(result["companies"], pd.DataFrame)
        and "country" in result["companies"].columns
    ):
        comp_df = result["companies"].copy()
        comp_df["country"] = comp_df["country"].apply(normalize_country)

        company_signal = (
            comp_df
            .query("country != 'Unknown'")
            .groupby("country")
            .size()
            .apply(log_safe)
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

    # ---------- Raw weighted scores ----------
    raw_scores = {
        country: (
            0.5 * patent_signal.get(country, 0)
            + 0.3 * publication_signal.get(country, 0)
            + 0.2 * company_signal.get(country, 0)
        )
        for country in countries
    }

    # ---------- Ensure TOP_N countries ----------
    sorted_scores = sorted(raw_scores.items(), key=lambda x: x[1], reverse=True)

    # keep non-zero first
    filtered = [(c, s) for c, s in sorted_scores if s > 0]

    # if too few, pad with next strongest (even if zero)
    if len(filtered) < TOP_N:
        filtered = sorted_scores[:TOP_N]

    raw_scores = dict(filtered)

    # ---------- Normalize to percentages ----------
    total_score = sum(raw_scores.values()) or 1

    investment_index = {
        country: round((score / total_score) * 100, 2)
        for country, score in raw_scores.items()
    }

    # ---------- Optional: Others bucket ----------
    shown_countries = set(investment_index.keys())
    others_score = sum(
        v for k, v in raw_scores.items() if k not in shown_countries
    )

    if others_score > 0:
        investment_index["Others"] = round(
            100 - sum(investment_index.values()), 2
        )

    # ---------- Final sorted output ----------
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

def generate_summary(tech: str) -> str:
    """
    Generates a precise, textbook-grade technical definition
    using Gemini. Safe, single-call, cacheable.
    """
    from google import genai
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    prompt = f"""
Write a precise, textbook-style technical explanation of {tech}.

STRICT FORMAT RULES:
- DO NOT use markdown
- DO NOT use **bold**, *italics*, bullet points, or headings
- Output plain text only
- No asterisks, no lists, no formatting

CONTENT RULES:
- First sentence must define what it physically or mathematically is
- Mention governing scientific or engineering principles
- Clearly distinguish it from closely related technologies
- Explain how scientists and engineers of organisations like drdo,isro,iits etc  use this technology
- Briefly describe its current global research or industrial usage

LENGTH RULES:
- Exactly 3 paragraphs
- Each paragraph 3-4 sentences
- Total length must be under 160 words

"""


    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    text = getattr(response, "text", "").strip()

    if not text or len(text.split()) < 50:
        raise RuntimeError("Weak or empty Gemini response")

    return text



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
    summary_text = generate_summary(tech)
        # ================== NaN SANITIZATION ==================

    patents   = patents.replace({np.nan: None})
    papers    = papers.replace({np.nan: None})
    companies = companies.replace({np.nan: None})
    market    = market.replace({np.nan: None})
     


    def safe(val):

        if val is None:
            return None

        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return None

        if isinstance(val, (np.floating, np.integer)) and np.isnan(val):
            return None

        if pd.isna(val):
            return None

        return val


    output = {
        "technology": tech_key,
        "overview":{ "text":summary_text},
        # ================= SUMMARY =================
        "summary": {
            "trl": (
                int(patents["trl"].median())
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
                    "link": safe(r.get("link")),
                    "year": safe(r.get("year")),
                    "trl": safe(r.get("trl")),
                    "country": safe(r.get("country")),
                }
                for _, r in patents.iterrows()
            ] if isinstance(patents, pd.DataFrame) else [],

            "papers": [
                {
                    "title": r.get("title"),
                    "snippet": r.get("snippet"),
                    "abstract": r.get("abstract"),
                    "doi": r.get("doi"),
                    "journal": r.get("journal"),
                    "citations": r.get("citations"),
                    "link": r.get("link"),
                    "year": r.get("year"),
                    "insights": r.get("insights"),
                    "country": safe(r.get("country")),
                }
                for _, r in papers.iterrows()
            ] if isinstance(papers, pd.DataFrame) else [],

            "companies": [
                {
                    "name": r.get("name"),
                    "description": r.get("description"),
                    "link": safe(r.get("link")),
                    "importance": r.get("importance"),
                    "insight": r.get("insight"),
                    "implication": r.get("implication"),
                    "country": safe(r.get("country")),
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
        "alerts": [
            {
                "type": "patent",
                "message": f"{tech_key} patent activity rising",
                "time": "recent",
            }
        ],
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