from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    id_token: str
    # Present only when Google actually issued one for this sign-in (first consent, or every
    # time since the OAuth flow forces prompt=consent) -- grants calendar.events access.
    calendar_refresh_token: str | None = None
    # Fallback profile photo URL fetched by the route handler from Google's userinfo endpoint
    # (using the access_token) -- some Workspace orgs omit "picture" from the id_token itself
    # even when it's present on the account, but userinfo still returns it. Cosmetic only
    # (never used for identity/auth decisions), so trusting the client-forwarded value here is
    # fine -- worst case is a wrong avatar image, not an auth bypass.
    picture_url_hint: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentEmployeeOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: str
    picture_url: str | None = None
    position: str | None = None
    role: str
    employment_status: str
    department_id: int
    department_name: str | None = None
    manager_id: int | None = None
    manager_name: str | None = None
    date_of_joining: str

    model_config = {"from_attributes": True}
