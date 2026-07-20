from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database.postgres import Base


class DimBusiness(Base):
    __tablename__ = "dim_business"

    business_id   = Column(UUID(as_uuid=True), primary_key=True)
    company_key   = Column(String(100), unique=True, nullable=True)
    business_name = Column(String(200), nullable=False)
    jurisdiction  = Column(String(10))
    currency      = Column(String(3))
    timezone      = Column(String(50))
    is_active     = Column(Boolean, default=True, nullable=False)
    is_platform   = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime(timezone=True), nullable=False)
    updated_at    = Column(DateTime(timezone=True), nullable=False)
