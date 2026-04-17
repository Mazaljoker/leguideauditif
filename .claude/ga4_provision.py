"""
Script one-shot : regenere le token OAuth avec analytics.edit,
puis provisionne GA4 (Key Event + 4 Custom Dimensions) pour leguideauditif.fr.

Usage :
    python .claude/ga4_provision.py

Le script :
1. Lit le token existant pour recuperer client_id/client_secret
2. Ouvre le navigateur pour re-autoriser avec analytics.edit
3. Sauve le nouveau token
4. Appelle l'API Admin GA4 :
   - POST keyEvents pour marquer revendication_success
   - POST customDimensions x4 (transaction_id, event_source, utm_source, centre_slug)
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(SCRIPT_DIR, "google_token.json")
PROPERTY_ID = "531522931"  # leguideauditif.fr GA4 property

# Scopes : existants + edit pour Admin API
SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.edit",  # NOUVEAU
]

CUSTOM_DIMENSIONS = [
    {
        "parameterName": "transaction_id",
        "displayName": "Transaction ID",
        "description": "UUID v4 partage client gtag + MP serveur pour dedup",
        "scope": "EVENT",
    },
    {
        "parameterName": "event_source",
        "displayName": "Event Source",
        "description": "Origine de l'event : client (gtag) ou server (MP)",
        "scope": "EVENT",
    },
    {
        "parameterName": "utm_source",
        "displayName": "UTM Source (conversion)",
        "description": "Source marketing first-touch capturee au landing",
        "scope": "EVENT",
    },
    {
        "parameterName": "centre_slug",
        "displayName": "Centre Slug",
        "description": "Slug du centre audioprothesiste revendique",
        "scope": "EVENT",
    },
]


def regenerate_token():
    """Relance OAuth flow avec scopes etendus."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    with open(TOKEN_FILE) as f:
        token_data = json.load(f)

    client_config = {
        "installed": {
            "client_id": token_data["client_id"],
            "client_secret": token_data["client_secret"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": token_data["token_uri"],
            "redirect_uris": ["http://localhost"],
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    print("Ouverture du navigateur pour consentement OAuth...")
    print("Cliquez 'Allow' dans la page qui va s'ouvrir.")
    creds = flow.run_local_server(port=0, prompt="consent")

    token_data["token"] = creds.token
    token_data["refresh_token"] = creds.refresh_token or token_data["refresh_token"]
    token_data["scopes"] = list(creds.scopes)

    with open(TOKEN_FILE, "w") as f:
        json.dump(token_data, f, indent=2)

    print(f"Nouveau token sauve. Scopes : {token_data['scopes']}")
    return creds


def provision_ga4(creds):
    """Cree Key Event + 4 Custom Dimensions via Admin API."""
    from googleapiclient.discovery import build

    service = build("analyticsadmin", "v1beta", credentials=creds)
    property_path = f"properties/{PROPERTY_ID}"

    # --- 1. Key Event : revendication_success ---
    print(f"\n[1/5] Creation Key Event 'revendication_success'...")
    try:
        result = service.properties().keyEvents().create(
            parent=property_path,
            body={"eventName": "revendication_success", "countingMethod": "ONCE_PER_EVENT"},
        ).execute()
        print(f"  OK : {result.get('name')}")
    except Exception as e:
        msg = str(e)
        if "already exists" in msg.lower() or "ALREADY_EXISTS" in msg:
            print(f"  Deja present (OK)")
        else:
            print(f"  ERREUR : {msg[:200]}")

    # --- 2-5. Custom Dimensions ---
    for i, dim in enumerate(CUSTOM_DIMENSIONS, start=2):
        print(f"\n[{i}/5] Creation Custom Dimension '{dim['displayName']}' (param={dim['parameterName']})...")
        try:
            result = service.properties().customDimensions().create(
                parent=property_path,
                body=dim,
            ).execute()
            print(f"  OK : {result.get('name')}")
        except Exception as e:
            msg = str(e)
            if "already exists" in msg.lower() or "ALREADY_EXISTS" in msg:
                print(f"  Deja present (OK)")
            else:
                print(f"  ERREUR : {msg[:200]}")


def rollback_scopes():
    """Retire analytics.edit du token apres provisioning (securite)."""
    with open(TOKEN_FILE) as f:
        token_data = json.load(f)

    original_scopes = [s for s in token_data["scopes"] if "analytics.edit" not in s]
    token_data["scopes"] = original_scopes

    with open(TOKEN_FILE, "w") as f:
        json.dump(token_data, f, indent=2)

    print(f"\nScopes rollback : {original_scopes}")
    print("Token redevenu readonly. Re-run ce script pour provisionner a nouveau.")


if __name__ == "__main__":
    print(f"Property ID GA4 : properties/{PROPERTY_ID} (leguideauditif.fr)\n")

    creds = regenerate_token()
    provision_ga4(creds)

    # Rollback auto si flag --rollback
    if "--rollback" in sys.argv:
        rollback_scopes()
    else:
        print("\nPour retirer analytics.edit du token (securite) :")
        print("  python .claude/ga4_provision.py --rollback-only")

    if "--rollback-only" in sys.argv:
        rollback_scopes()
