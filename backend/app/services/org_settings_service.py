from sqlalchemy.orm import Session

from app.models import OrgSettings

SETTINGS_ID = 1


def get_org_settings(db: Session) -> OrgSettings:
    settings = db.get(OrgSettings, SETTINGS_ID)
    if settings is None:
        settings = OrgSettings(id=SETTINGS_ID, requires_second_level_approval=False)
        db.add(settings)
        db.flush()
    return settings
