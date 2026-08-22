from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings

_google_request = google_requests.Request()


@dataclass
class GoogleIdentity:
    sub: str
    email: str
    email_verified: bool
    full_name: str | None
    picture_url: str | None


def verify_google_id_token(raw_id_token: str) -> GoogleIdentity:
    """Verifies the id_token's signature against Google's published JWKS and checks
    issuer/audience/expiry. Raises ValueError on any failure. This MUST happen server-side
    (not trust a plain email posted by the client) -- otherwise anyone who can reach this
    endpoint could mint a session for any employee just by claiming their email.
    """
    claims = google_id_token.verify_oauth2_token(raw_id_token, _google_request, settings.google_client_id)
    return GoogleIdentity(
        sub=claims["sub"],
        email=claims["email"],
        email_verified=bool(claims.get("email_verified", False)),
        full_name=claims.get("name"),
        picture_url=claims.get("picture"),
    )
