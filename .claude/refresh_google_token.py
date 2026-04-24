"""
Regenere le token OAuth Google (GSC + GA4 readonly) quand refresh_token
a ete expire/revoque.

Usage :
    python .claude/refresh_google_token.py

Ce script :
1. Lit client_id/client_secret du token actuel
2. Ouvre le navigateur pour consentement
3. Ecrase .claude/google_token.json avec les nouveaux credentials
"""
import json
import os
import sys

# Le token partage est au root du repo .claude/ (pas le worktree)
TOKEN_FILE = r"c:/Users/Franck-Olivier/dev/leguideauditif-claude-code/leguideauditif/.claude/google_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.edit",  # conserve pour compat ga4_provision
]

def main():
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
    print("Ouverture du navigateur...")
    print(">>> Cliquez 'Allow' quand la page s'ouvre.")
    print(">>> Si l'ecran 'App not verified' apparait : Advanced -> Go to (unsafe).")
    creds = flow.run_local_server(port=0, prompt="consent")

    token_data["token"] = creds.token
    if creds.refresh_token:
        token_data["refresh_token"] = creds.refresh_token
    token_data["scopes"] = list(creds.scopes)

    with open(TOKEN_FILE, "w") as f:
        json.dump(token_data, f, indent=2)

    print(f"\nToken regenere. Scopes actifs :")
    for s in token_data["scopes"]:
        print(f"  - {s}")
    print(f"\nFichier : {TOKEN_FILE}")

    # Test immediat
    print("\nTest GSC...")
    sys.path.insert(0, r"c:/Users/Franck-Olivier/dev/leguideauditif-claude-code/leguideauditif/.claude")
    from google_api import get_gsc_top_queries
    top = get_gsc_top_queries("leguideauditif", days=7, limit=3)
    for r in top:
        print(f"  {r['keys'][0][:40]:40s}  clicks={r['clicks']}  impr={r['impressions']}")
    print("\nOK -- le token fonctionne.")

if __name__ == "__main__":
    main()
