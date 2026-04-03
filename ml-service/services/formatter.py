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
    adoption_curve = result.get("adoption_curve")

    # --- normalize curves ---
    final_trend_curve = (
        df_to_records(adoption_curve)
        if hasattr(adoption_curve, "to_dict")
        else adoption_curve
        if isinstance(adoption_curve, list)
        else trend_curve
        if isinstance(trend_curve, list)
        else []
    )

    # --- overview block ---
    overview_text = result.get(
      "summary_text",
      f"{tech_name.replace('_', ' ').title()} is an emerging technology tracked in Tech Intel."
    )   
    return {
        "dashboard": {
            "technology": tech_name,
            "category": "Emerging Technology",
            "overview": {
                "text": overview_text
            },
            "summary": {
                "trl": int(patents["trl"].median())
                if patents is not None and not patents.empty and "trl" in patents
                else 2,
                "growth_stage": hype_stage,
                "market_size_billion_usd": safe_value(max(market_forecast["billions"]))
                if market_forecast is not None and "billions" in market_forecast
                else None,
                "signals": len(patents) if patents is not None else 0,
            },

            # restore old naming
            "trend_curve": final_trend_curve,
            "country_investment": result.get(
                "country_investment",
                {"type": "relative_investment_index", "values": {}}
            ),
            "patent_timeline": df_to_records(patents_year),
            "paper_timeline": df_to_records(papers_year),
            "funding_timeline": df_to_records(funding_year),
            "market_timeline": df_to_records(market_year),

            "patents_country": df_to_records(patents_country),
            "papers_country": df_to_records(papers_country),

            "entities": {
                "patents": df_to_records(patents),
                "papers": df_to_records(papers),
                "companies": df_to_records(companies),
                "funding": df_to_records(funding),
                "market_reports": df_to_records(market),
            },

            "alerts": result.get("alerts", []),
        },

        "knowledge_graph": knowledge_graph,

        # optional metadata
        "source": "ml-generated",
        "updated_at": None,
    }