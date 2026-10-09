import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.data.seed_data import reset_and_seed_database
from app.api.deps import create_access_token
from app.models.user import User

# Test in-memory SQLite database
TEST_DB_URL = "sqlite:///./test_cardiolens.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        reset_and_seed_database(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def patient_token(db_session):
    user = db_session.query(User).filter(User.email == "patient@cardiolens.demo").first()
    return create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})

@pytest.fixture
def doctor_token(db_session):
    user = db_session.query(User).filter(User.email == "doctor@cardiolens.demo").first()
    return create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})

@pytest.fixture
def caregiver_token(db_session):
    user = db_session.query(User).filter(User.email == "caregiver@cardiolens.demo").first()
    return create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
