import pandas as pd
import numpy as np

def safe_value(val):
    if val is None:
        return None
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return None
    if pd.isna(val):
        return None
    return val

def df_to_records(df):
    if not isinstance(df, pd.DataFrame) or df.empty:
        return []
    df = df.replace({np.nan: None})
    return df.to_dict(orient="records")