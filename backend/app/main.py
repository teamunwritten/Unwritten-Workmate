from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import actions, admin, auth, calendar, compensation, dashboard, files, leave, payroll
from app.services.scheduler import start_scheduler, stop_scheduler

app = FastAPI(title="Unwritten Workmate API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leave.router)
app.include_router(admin.router)
app.include_router(calendar.router)
app.include_router(dashboard.router)
app.include_router(files.router)
app.include_router(actions.router)
app.include_router(compensation.router)
app.include_router(payroll.router)


@app.on_event("startup")
def _start_scheduler() -> None:
    start_scheduler()


@app.on_event("shutdown")
def _stop_scheduler() -> None:
    stop_scheduler()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
