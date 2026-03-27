from scripts.run_pipeline import run_pipeline_for_tech, generate_alerts
from services.formatter import format_pipeline_result

def run_technology_pipeline(technology_name: str):
    result = run_pipeline_for_tech(technology_name)

    # attach alerts if not already present
    try:
        result["alerts"] = generate_alerts(result, technology_name.lower().replace(" ", "_"))
    except Exception:
        result["alerts"] = []

    formatted = format_pipeline_result(technology_name, result)
    return formatted