from services.serializers import df_to_records, safe_value

def format_pipeline_result(tech_name, result):
    patents = result.get("patents")
    papers = result.get("papers")
    companies = result.get("companies")
    funding = result.get("funding")
    market = result.get("market")

    patents_year = result.get("patents_year")
    papers_year = result.get("papers_year")
    funding_year = result.get("funding_year")
    market_year = result.get("market_year")

    patents_country = result.get("patents_country")
    papers_country = result.get("papers_country")

    market_forecast = result.get("market_forecast")
    maturity_score = result.get("maturity_score", 0)
    hype_stage = result.get("hype_stage", "Unknown")
    knowledge_graph = result.get("knowledge_graph", {"nodes": [], "edges": []})

    trend_curve = result.get("trend_curve", [])

    return {
        "name": tech_name,
        "category": "Emerging Technology",
        "description": f"{tech_name} is an emerging technology tracked in Tech Intel.",
        "growth_score": int(min(100, max(0, maturity_score * 100))) if maturity_score else 65,
        "research_activity": len(papers) if papers is not None else 0,
        "market_demand": len(market) if market is not None else 0,
        "startup_activity": len(companies) if companies is not None else 0,
        "job_demand": len(funding) if funding is not None else 0,
        "maturity_level": hype_stage,
        "trend": trend_curve if isinstance(trend_curve, list) else [],

        # full intelligence payload
        "summary": {
            "trl": int(patents["trl"].median()) if patents is not None and not patents.empty and "trl" in patents else 2,
            "growth_stage": hype_stage,
            "market_size_billion_usd": safe_value(max(market_forecast["billions"])) if market_forecast and "billions" in market_forecast else None,
            "signals": len(patents) if patents is not None else 0,
        },

        "country_investment": result.get("country_investment", {"type": "relative_investment_index", "values": {}}),
        "patent_timeline": df_to_records(patents_year),
        "paper_timeline": df_to_records(papers_year),
        "funding_timeline": df_to_records(funding_year),
        "market_timeline": df_to_records(market_year),

        "patents_country": df_to_records(patents_country),
        "papers_country": df_to_records(papers_country),

        "market_forecast": market_forecast,
        "maturity_score": safe_value(maturity_score),
        "adoption_curve": df_to_records(result.get("adoption_curve")) if hasattr(result.get("adoption_curve"), "to_dict") else result.get("adoption_curve", []),
        "knowledge_graph": knowledge_graph,

        "entities": {
            "patents": df_to_records(patents),
            "papers": df_to_records(papers),
            "companies": df_to_records(companies),
            "funding": df_to_records(funding),
            "market_reports": df_to_records(market),
        },

        "alerts": result.get("alerts", []),
        "source": "ml-generated",
    }