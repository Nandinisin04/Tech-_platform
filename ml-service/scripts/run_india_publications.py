import os
import json
import requests
from collections import defaultdict

# ================== CONFIG ==================

CROSSREF_URL = "https://api.crossref.org/works"
OUTPUT_DIR = "data/india"
import re

def clean_html(text):
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)  # remove HTML tags
    return text.strip()
FIELDS = {
    "artificial_intelligence": [
        "artificial intelligence", "machine learning",
        "deep learning", "computer vision"
    ],
    "semiconductors": [
        "semiconductor", "vlsi", "integrated circuits",
        "chip fabrication"
    ],
    "cybersecurity": [
        "cybersecurity", "network security",
        "cryptography", "malware"
    ],
    "space_technology": [
        "space technology", "satellite",
        "launch vehicle"
    ]
}

# ================== INDIA KEYWORDS (IMPROVED) ==================

INDIA_KEYWORDS = [
    "india", "indian",

    # IIT / IISc / IIIT
    "iit", "iit delhi", "iit bombay", "iit madras",
    "iit kanpur", "iit kharagpur",
    "iisc", "indian institute of science",
    "iiit",

    # Universities
    "delhi university", "anna university",
    "jadavpur university", "bhu",

    # Research orgs
    "csir", "drdo",
    "defence research and development organisation",

    # Space
    "isro", "indian space research organisation",

    # Medical
    "aiims",

    # Govt
    "government of india", "ministry of"
]

# ================== HELPERS ==================

def find_india_matches(text):
    t = str(text).lower()
    return [k for k in INDIA_KEYWORDS if k in t]


def extract_year(item):
    for key in ("published-print", "published-online", "issued"):
        if key in item and "date-parts" in item[key]:
            return item[key]["date-parts"][0][0]
    return None


def build_trend(items):
    counter = defaultdict(int)
    for it in items:
        if it.get("year"):
            counter[int(it["year"])] += 1

    return [
        {"year": y, "count": c}
        for y, c in sorted(counter.items())
    ]


# ================== CROSSREF ==================

def fetch_crossref(query, rows=100):
    params = {
        "query": query,
        "filter": "type:journal-article",
        "rows": rows,
        "mailto": "techintel@example.com"
    }

    try:
        r = requests.get(CROSSREF_URL, params=params, timeout=20)
        r.raise_for_status()
        return r.json()["message"]["items"]
    except Exception as e:
        print(f"❌ Error fetching: {query}")
        print(e)
        return []


# ================== FIELD FETCH ==================

def fetch_field_publications(field, keywords):
    print(f"\n🔍 Fetching: {field}")

    # ✅ Improved query (India-focused)
    query = "(" + " OR ".join(keywords) + ") AND (India OR Indian OR IIT OR IISc)"

    items = fetch_crossref(query)
    records = []

    for item in items:
        title = clean_html(" ".join(item.get("title", [])))
        abstract = clean_html(item.get("abstract", ""))
        authors = item.get("author", [])

        matched_institutes = []

        # Title + abstract
        matched_institutes.extend(find_india_matches(title))
        matched_institutes.extend(find_india_matches(abstract))

        # Affiliations
        for a in authors:
            for aff in (a.get("affiliation") or []):
                matched_institutes.extend(
                    find_india_matches(aff.get("name", ""))
                )

        # ✅ Strict but smart India filter
        if not matched_institutes:
            full_text = f"{title} {abstract}".lower()

            if not any(k in full_text for k in ["india", "indian", "iit", "iisc"]):
                continue

        doi = item.get("DOI")

        records.append({
            "title": title,
            "year": extract_year(item),
            "doi": doi,
            "citations": item.get("is-referenced-by-count", 0),
            "link": f"https://doi.org/{doi}" if doi else None,
            "field": field,
            "source": "Crossref",
            "matched_institute": list(set(matched_institutes))[0] if matched_institutes else "India"
        })


    return records

# ================== EXPORT ==================

def run_india_publications_pipeline():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    output = {
        "country": "India",
        "fields": {}
    }

    for field, keywords in FIELDS.items():
        publications = fetch_field_publications(field, keywords)

        output["fields"][field] = {
            "publications": publications,
            "trends": {
                "publications_year": build_trend(publications)
            }
        }

    # out_path = f"{OUTPUT_DIR}/india_publications_fields.json"
    # with open(out_path, "w", encoding="utf-8") as f:
    #     json.dump(output, f, indent=2, ensure_ascii=False)

    return output

# ================== ENTRY ==================

# if __name__ == "__main__":
#     export_india_fields_json()