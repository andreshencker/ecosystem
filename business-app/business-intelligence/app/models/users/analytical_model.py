from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database.postgres import Base


class DimUser(Base):
    __tablename__ = "dim_user"

    user_id     = Column(UUID(as_uuid=True), primary_key=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey("dim_business.business_id"), nullable=False)
    email       = Column(String(254), nullable=False)
    first_name  = Column(String(100))
    last_name   = Column(String(100))
    full_name   = Column(String(201))
    role        = Column(String(50))
    scope       = Column(String(20))
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), nullable=False)
    updated_at  = Column(DateTime(timezone=True), nullable=False)
