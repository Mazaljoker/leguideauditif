"""
Google API utility for nPosts SEO skills.
Provides GA4 + GSC access for both nposts.ai and leguideauditif.fr.

Usage in skills:
    from google_api import get_gsc_data, get_ga4_data, GA4_PROPERTIES, GSC_SITES

⚠️  Token file (.claude/google_token.json) must exist — NEVER commit to git.
"""

import json
import os
from datetime import datetime, timedelta

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(SCRIPT_DIR, "google_token.json")

GSC_SITES = {
    "nposts": "sc-domain:nposts.ai",
    "leguideauditif": "sc-domain:leguideauditif.fr",
}

GA4_PROPERTIES = {
    "nposts": "properties/519660640",
    "leguideauditif": "properties/531522931",
}


def _get_credentials():
    """Load and refresh Google OAuth credentials."""
    from google.oauth2.credentials import Credentials

    with open(TOKEN_FILE) as f:
        token_data = json.load(f)

    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )

    if creds.expired:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        # Save refreshed token
        token_data["token"] = creds.token
        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f, indent=2)

    return creds


def get_gsc_data(site="nposts", days=28, dimensions=None, row_limit=100):
    """
    Query Google Search Console.

    Args:
        site: "nposts" or "leguideauditif"
        days: Number of days to look back (default 28)
        dimensions: List of dimensions ["query", "page", "country", "device", "date"]
        row_limit: Max rows returned (default 100)

    Returns:
        List of dicts with keys: keys, clicks, impressions, ctr, position
    """
    from googleapiclient.discovery import build

    if dimensions is None:
        dimensions = ["query", "page"]

    creds = _get_credentials()
    service = build("searchconsole", "v1", credentials=creds)

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    request_body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
        "dataState": "final",
    }

    response = service.searchanalytics().query(
        siteUrl=GSC_SITES[site],
        body=request_body,
    ).execute()

    rows = response.get("rows", [])
    results = []
    for row in rows:
        results.append({
            "keys": row["keys"],
            "clicks": row["clicks"],
            "impressions": row["impressions"],
            "ctr": round(row["ctr"] * 100, 2),
            "position": round(row["position"], 1),
        })

    return results


def get_ga4_data(site="nposts", days=28, dimensions=None, metrics=None):
    """
    Query Google Analytics 4.

    Args:
        site: "nposts" or "leguideauditif"
        days: Number of days to look back (default 28)
        dimensions: List of dimension names ["pagePath", "sessionSource", "date", ...]
        metrics: List of metric names ["sessions", "totalUsers", "screenPageViews", ...]

    Returns:
        List of dicts with dimension and metric values
    """
    from googleapiclient.discovery import build

    if dimensions is None:
        dimensions = ["pagePath"]
    if metrics is None:
        metrics = ["sessions", "totalUsers", "screenPageViews"]

    creds = _get_credentials()
    service = build("analyticsdata", "v1beta", credentials=creds)

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    request_body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": 100,
    }

    response = service.properties().runReport(
        property=GA4_PROPERTIES[site],
        body=request_body,
    ).execute()

    results = []
    dim_headers = [h["name"] for h in response.get("dimensionHeaders", [])]
    met_headers = [h["name"] for h in response.get("metricHeaders", [])]

    for row in response.get("rows", []):
        entry = {}
        for i, dim in enumerate(row.get("dimensionValues", [])):
            entry[dim_headers[i]] = dim["value"]
        for i, met in enumerate(row.get("metricValues", [])):
            entry[met_headers[i]] = met["value"]
        results.append(entry)

    return results


def get_gsc_top_queries(site="nposts", days=28, limit=20):
    """Shortcut: top queries by clicks."""
    return get_gsc_data(site=site, days=days, dimensions=["query"], row_limit=limit)


def get_gsc_top_pages(site="nposts", days=28, limit=20):
    """Shortcut: top pages by clicks."""
    return get_gsc_data(site=site, days=days, dimensions=["page"], row_limit=limit)


def get_ga4_traffic_summary(site="nposts", days=28):
    """Shortcut: traffic summary by source."""
    return get_ga4_data(
        site=site,
        days=days,
        dimensions=["sessionSource"],
        metrics=["sessions", "totalUsers", "engagementRate"],
    )


def get_ga4_top_pages(site="nposts", days=28, limit=20):
    """Shortcut: top pages by sessions."""
    return get_ga4_data(
        site=site,
        days=days,
        dimensions=["pagePath"],
        metrics=["sessions", "screenPageViews", "engagementRate"],
    )


# --- Quick test ---
if __name__ == "__main__":
    print("=== GSC nposts.ai — Top 5 queries ===")
    for row in get_gsc_top_queries("nposts", limit=5):
        print(f"  {row['keys'][0]:40s} clicks={row['clicks']:4d}  pos={row['position']}")

    print("\n=== GSC leguideauditif.fr — Top 5 queries ===")
    for row in get_gsc_top_queries("leguideauditif", limit=5):
        print(f"  {row['keys'][0]:40s} clicks={row['clicks']:4d}  pos={row['position']}")

    print("\n=== GA4 nposts.ai — Traffic by source ===")
    for row in get_ga4_traffic_summary("nposts")[:5]:
        print(f"  {row.get('sessionSource','?'):20s} sessions={row.get('sessions','0')}")

    print("\n=== GA4 leguideauditif — Traffic by source ===")
    for row in get_ga4_traffic_summary("leguideauditif")[:5]:
        print(f"  {row.get('sessionSource','?'):20s} sessions={row.get('sessions','0')}")
