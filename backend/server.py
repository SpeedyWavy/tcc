from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
import math
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Google Maps
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== HELPERS ====================

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    # Remove password from responses
    doc.pop("password", None)

    # Keep compatibility between legacy PT-BR field names and current API names.
    if "name" in doc and "nome" not in doc:
        doc["nome"] = doc["name"]
    if "address" in doc and "endereco" not in doc:
        doc["endereco"] = doc["address"]
    if "parent_contact" in doc and "contato_responsavel" not in doc:
        doc["contato_responsavel"] = doc["parent_contact"]
    if "responsible_name" in doc and "responsavel" not in doc:
        doc["responsavel"] = doc["responsible_name"]
    if "transport_identification" in doc and "transporte" not in doc:
        doc["transporte"] = doc["transport_identification"]
    if "unit" in doc and "unidade" not in doc:
        doc["unidade"] = doc["unit"]

    return doc

def serialize_docs(docs: list) -> list:
    return [serialize_doc(doc) for doc in docs]

# ==================== CONSTANTS ====================

class UserRole:
    ADMIN = "admin"
    DRIVER = "driver"

class VehicleStatus:
    GARAGE = "garage"
    TRANSIT = "transit"

# ==================== PYDANTIC MODELS ====================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    full_name: str
    password: str

class UserCreate(BaseModel):
    full_name: str
    password: str
    role: str = UserRole.DRIVER
    cpf: Optional[str] = None
    email: Optional[str] = None
    rg: Optional[str] = None
    cnh_category: Optional[str] = None
    transport_identification: Optional[str] = None
    contact: Optional[str] = None
    schedules: Optional[str] = None
    unit: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: str
    password: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    rg: Optional[str] = None
    cnh_category: Optional[str] = None
    transport_identification: Optional[str] = None
    contact: Optional[str] = None
    schedules: Optional[str] = None
    unit: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    address: str
    parent_contact: Optional[str] = None
    rm: Optional[str] = None
    responsible_name: Optional[str] = None
    transport_identification: Optional[str] = None
    unit: Optional[str] = None

class VehicleCreate(BaseModel):
    license_plate: str
    model: str
    capacity: int
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    identification: Optional[str] = None
    unit: Optional[str] = None

class VehicleStatusUpdate(BaseModel):
    status: str

# ==================== UTILITIES ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    
    return serialize_doc(user)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def geocode_address(address: str) -> tuple:
    """Convert address to latitude and longitude using Google Maps Geocoding API"""
    if GOOGLE_MAPS_API_KEY:
        try:
            async with httpx.AsyncClient() as client_http:
                response = await client_http.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={"address": address, "key": GOOGLE_MAPS_API_KEY},
                    timeout=10
                )
                data = response.json()
                if data.get("status") == "OK" and data.get("results"):
                    location = data["results"][0]["geometry"]["location"]
                    return (location["lat"], location["lng"])
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
    
    # Fallback: simple geocoding with Nominatim
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent="school_transport_app")
        location = geolocator.geocode(address, timeout=10)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        logger.error(f"Fallback geocoding error: {e}")
    
    return (None, None)

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in kilometers"""
    if None in [lat1, lon1, lat2, lon2]:
        return float('inf')
    
    R = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

# ==================== SEED DATA ====================

@app.on_event("startup")
async def seed_admin():
    """Create initial admin user if not exists"""
    admin_exists = await db.users.find_one({"full_name": "Debora", "role": UserRole.ADMIN})
    if not admin_exists:
        admin_data = {
            "full_name": "Debora",
            "password": hash_password("12345"),
            "role": UserRole.ADMIN,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_data)
        logger.info("Admin user created: Debora")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"full_name": request.full_name})
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome ou senha incorretos"
        )
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    user_data = {
        "id": user_id,
        "full_name": user["full_name"],
        "role": user["role"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== ADMIN MANAGEMENT ====================

@api_router.post("/admins")
async def create_admin(admin: UserCreate, current_user: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({"full_name": admin.full_name})
    if existing:
        raise HTTPException(status_code=400, detail="Usuário com este nome já existe")
    
    admin_data = {
        "full_name": admin.full_name,
        "password": hash_password(admin.password),
        "role": UserRole.ADMIN,
        "cpf": admin.cpf,
        "email": admin.email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(admin_data)
    created = await db.users.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@api_router.get("/admins")
async def get_admins(current_user: dict = Depends(get_admin_user)):
    admins = await db.users.find({"role": UserRole.ADMIN}).to_list(1000)
    return serialize_docs(admins)

@api_router.put("/admins/{admin_id}")
async def update_admin(admin_id: str, admin: UserUpdate, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = {
        "full_name": admin.full_name,
        "cpf": admin.cpf,
        "email": admin.email,
    }
    if admin.password:
        update_data["password"] = hash_password(admin.password)
    
    result = await db.users.update_one(
        {"_id": ObjectId(admin_id), "role": UserRole.ADMIN},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Administrador não encontrado")
    
    updated = await db.users.find_one({"_id": ObjectId(admin_id)})
    return serialize_doc(updated)

@api_router.delete("/admins/{admin_id}")
async def delete_admin(admin_id: str, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Prevent deleting yourself
    if admin_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Você não pode excluir a si mesmo")
    
    admin_count = await db.users.count_documents({"role": UserRole.ADMIN})
    if admin_count <= 1:
        raise HTTPException(status_code=400, detail="Deve existir pelo menos um administrador")
    
    result = await db.users.delete_one({"_id": ObjectId(admin_id), "role": UserRole.ADMIN})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Administrador não encontrado")
    
    return {"message": "Administrador excluído com sucesso"}

# ==================== DRIVER ENDPOINTS ====================

@api_router.post("/drivers")
async def create_driver(driver: UserCreate, current_user: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({"full_name": driver.full_name})
    if existing:
        raise HTTPException(status_code=400, detail="Motorista com este nome já existe")
    
    driver_data = {
        "full_name": driver.full_name,
        "password": hash_password(driver.password),
        "role": UserRole.DRIVER,
        "cpf": driver.cpf,
        "email": driver.email,
        "rg": driver.rg,
        "cnh_category": driver.cnh_category,
        "transport_identification": driver.transport_identification,
        "contact": driver.contact,
        "schedules": driver.schedules,
        "unit": driver.unit,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(driver_data)
    created = await db.users.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@api_router.get("/drivers")
async def get_drivers(current_user: dict = Depends(get_current_user)):
    drivers = await db.users.find({"role": UserRole.DRIVER}).to_list(1000)
    return serialize_docs(drivers)

@api_router.get("/drivers/{driver_id}")
async def get_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(driver_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    driver = await db.users.find_one({"_id": ObjectId(driver_id), "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    
    return serialize_doc(driver)

@api_router.put("/drivers/{driver_id}")
async def update_driver(driver_id: str, driver: UserUpdate, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(driver_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = {
        "full_name": driver.full_name,
        "cpf": driver.cpf,
        "email": driver.email,
        "rg": driver.rg,
        "cnh_category": driver.cnh_category,
        "transport_identification": driver.transport_identification,
        "contact": driver.contact,
        "schedules": driver.schedules,
        "unit": driver.unit,
    }
    if driver.password:
        update_data["password"] = hash_password(driver.password)
    
    result = await db.users.update_one(
        {"_id": ObjectId(driver_id), "role": UserRole.DRIVER},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    
    updated = await db.users.find_one({"_id": ObjectId(driver_id)})
    return serialize_doc(updated)

@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(driver_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Remove driver from vehicles
    await db.vehicles.update_many(
        {"driver_id": driver_id},
        {"$set": {"driver_id": None}}
    )
    
    # Delete routes associated with driver
    await db.routes.delete_many({"driver_id": driver_id})
    
    result = await db.users.delete_one({"_id": ObjectId(driver_id), "role": UserRole.DRIVER})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    
    return {"message": "Motorista excluído com sucesso"}

# ==================== STUDENT ENDPOINTS ====================

@api_router.post("/students")
async def create_student(student: StudentCreate, current_user: dict = Depends(get_admin_user)):
    lat, lon = await geocode_address(student.address)
    
    student_data = {
        "name": student.name,
        "nome": student.name,
        "rm": student.rm,
        "address": student.address,
        "endereco": student.address,
        "latitude": lat,
        "longitude": lon,
        "parent_contact": student.parent_contact,
        "contato_responsavel": student.parent_contact,
        "responsible_name": student.responsible_name,
        "responsavel": student.responsible_name,
        "transport_identification": student.transport_identification,
        "transporte": student.transport_identification,
        "unit": student.unit,
        "unidade": student.unit,
        "route_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.students.insert_one(student_data)
    created = await db.students.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@api_router.get("/students")
async def get_students(current_user: dict = Depends(get_current_user)):
    students = await db.students.find().to_list(1000)
    return serialize_docs(students)

@api_router.get("/students/{student_id}")
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    return serialize_doc(student)

@api_router.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentCreate, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    lat, lon = await geocode_address(student.address)
    
    update_data = {
        "name": student.name,
        "nome": student.name,
        "rm": student.rm,
        "address": student.address,
        "endereco": student.address,
        "latitude": lat,
        "longitude": lon,
        "parent_contact": student.parent_contact,
        "contato_responsavel": student.parent_contact,
        "responsible_name": student.responsible_name,
        "responsavel": student.responsible_name,
        "transport_identification": student.transport_identification,
        "transporte": student.transport_identification,
        "unit": student.unit,
        "unidade": student.unit,
    }
    
    result = await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    updated = await db.students.find_one({"_id": ObjectId(student_id)})
    return serialize_doc(updated)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Remove student from routes
    await db.routes.update_many(
        {},
        {"$pull": {"stops": {"student_id": student_id}}}
    )
    
    result = await db.students.delete_one({"_id": ObjectId(student_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    return {"message": "Aluno excluído com sucesso"}

# ==================== VEHICLE ENDPOINTS ====================

@api_router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate, current_user: dict = Depends(get_admin_user)):
    existing = await db.vehicles.find_one({"license_plate": vehicle.license_plate})
    if existing:
        raise HTTPException(status_code=400, detail="Veículo com esta placa já existe")
    
    resolved_driver_id = vehicle.driver_id
    if not resolved_driver_id and vehicle.driver_name:
        driver = await db.users.find_one({
            "full_name": vehicle.driver_name,
            "role": UserRole.DRIVER,
        })
        if driver:
            resolved_driver_id = str(driver["_id"])

    vehicle_data = {
        "license_plate": vehicle.license_plate,
        "model": vehicle.model,
        "capacity": vehicle.capacity,
        "status": VehicleStatus.GARAGE,
        "driver_id": resolved_driver_id,
        "driver_name": vehicle.driver_name,
        "identification": vehicle.identification,
        "unit": vehicle.unit,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.vehicles.insert_one(vehicle_data)
    created = await db.vehicles.find_one({"_id": result.inserted_id})
    return serialize_doc(created)

@api_router.get("/vehicles")
async def get_vehicles(current_user: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find().to_list(1000)
    return serialize_docs(vehicles)

@api_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    vehicle = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    return serialize_doc(vehicle)

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, vehicle: VehicleCreate, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(vehicle_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    resolved_driver_id = vehicle.driver_id
    if not resolved_driver_id and vehicle.driver_name:
        driver = await db.users.find_one({
            "full_name": vehicle.driver_name,
            "role": UserRole.DRIVER,
        })
        if driver:
            resolved_driver_id = str(driver["_id"])

    update_data = {
        "license_plate": vehicle.license_plate,
        "model": vehicle.model,
        "capacity": vehicle.capacity,
        "driver_id": resolved_driver_id,
        "driver_name": vehicle.driver_name,
        "identification": vehicle.identification,
        "unit": vehicle.unit,
    }
    
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    updated = await db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    return serialize_doc(updated)

@api_router.patch("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, body: VehicleStatusUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(vehicle_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    if body.status not in [VehicleStatus.GARAGE, VehicleStatus.TRANSIT]:
        raise HTTPException(status_code=400, detail="Status inválido. Use 'garage' ou 'transit'")
    
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": {"status": body.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    return {"message": "Status atualizado com sucesso", "status": body.status}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(vehicle_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Delete associated routes
    await db.routes.delete_many({"vehicle_id": vehicle_id})
    
    result = await db.vehicles.delete_one({"_id": ObjectId(vehicle_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    return {"message": "Veículo excluído com sucesso"}

# ==================== ROUTE ENDPOINTS ====================

@api_router.post("/routes/generate")
async def generate_routes(current_user: dict = Depends(get_admin_user)):
    """Generate routes automatically by grouping students by proximity"""
    
    students = await db.students.find({"latitude": {"$ne": None}}).to_list(1000)
    vehicles = await db.vehicles.find({"driver_id": {"$ne": None}}).to_list(1000)
    
    if not students:
        raise HTTPException(status_code=400, detail="Nenhum aluno com endereço geocodificado encontrado")
    
    if not vehicles:
        raise HTTPException(status_code=400, detail="Nenhum veículo com motorista atribuído encontrado")
    
    # Clear existing routes
    await db.routes.delete_many({})
    await db.students.update_many({}, {"$set": {"route_id": None}})
    
    # Simple nearest-neighbor clustering
    unassigned = students.copy()
    created_routes = []
    
    for vehicle in vehicles:
        if not unassigned:
            break
        
        vehicle_id = str(vehicle["_id"])
        capacity = vehicle["capacity"]
        route_students = []
        
        # Start with first unassigned student
        first_student = unassigned.pop(0)
        route_students.append(first_student)
        current_lat = first_student["latitude"]
        current_lon = first_student["longitude"]
        
        # Find nearest students up to capacity
        while len(route_students) < capacity and unassigned:
            nearest_idx = None
            nearest_dist = float('inf')
            
            for idx, student in enumerate(unassigned):
                dist = haversine_distance(
                    current_lat, current_lon,
                    student["latitude"], student["longitude"]
                )
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_idx = idx
            
            if nearest_idx is not None:
                nearest_student = unassigned.pop(nearest_idx)
                route_students.append(nearest_student)
                current_lat = nearest_student["latitude"]
                current_lon = nearest_student["longitude"]
            else:
                break
        
        # Create route
        stops = []
        for idx, student in enumerate(route_students):
            stops.append({
                "student_id": str(student["_id"]),
                "student_name": student["name"],
                "address": student["address"],
                "latitude": student["latitude"],
                "longitude": student["longitude"],
                "order": idx + 1
            })
        
        route_data = {
            "vehicle_id": vehicle_id,
            "driver_id": vehicle["driver_id"],
            "stops": stops,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.routes.insert_one(route_data)
        route_id = str(result.inserted_id)
        
        # Update students with route_id
        student_ids = [ObjectId(stop["student_id"]) for stop in stops]
        await db.students.update_many(
            {"_id": {"$in": student_ids}},
            {"$set": {"route_id": route_id}}
        )
        
        created_routes.append(route_id)
    
    return {
        "message": f"{len(created_routes)} rota(s) criada(s) com sucesso",
        "routes_created": len(created_routes),
        "students_assigned": len(students) - len(unassigned),
        "students_unassigned": len(unassigned)
    }

@api_router.get("/routes")
async def get_routes(current_user: dict = Depends(get_current_user)):
    routes = await db.routes.find().to_list(1000)
    return serialize_docs(routes)

@api_router.get("/routes/{route_id}")
async def get_route(route_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(route_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    route = await db.routes.find_one({"_id": ObjectId(route_id)})
    if not route:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    
    return serialize_doc(route)

@api_router.delete("/routes/{route_id}")
async def delete_route(route_id: str, current_user: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(route_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Unassign students from this route
    await db.students.update_many(
        {"route_id": route_id},
        {"$set": {"route_id": None}}
    )
    
    result = await db.routes.delete_one({"_id": ObjectId(route_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    
    return {"message": "Rota excluída com sucesso"}

# ==================== DRIVER OWN ROUTE ====================

@api_router.get("/drivers/me/route")
async def get_my_route(current_user: dict = Depends(get_current_user)):
    """Get the route assigned to the logged-in driver"""
    if current_user.get("role") != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Apenas motoristas podem acessar esta rota")
    
    route = await db.routes.find_one({"driver_id": current_user["id"]})
    if not route:
        raise HTTPException(status_code=404, detail="Nenhuma rota atribuída")
    
    return serialize_doc(route)

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_admin_user)):
    total_students = await db.students.count_documents({})
    total_drivers = await db.users.count_documents({"role": UserRole.DRIVER})
    total_vehicles = await db.vehicles.count_documents({})
    vehicles_in_transit = await db.vehicles.count_documents({"status": VehicleStatus.TRANSIT})
    vehicles_in_garage = await db.vehicles.count_documents({"status": VehicleStatus.GARAGE})
    total_routes = await db.routes.count_documents({})
    total_admins = await db.users.count_documents({"role": UserRole.ADMIN})
    
    return {
        "total_students": total_students,
        "total_drivers": total_drivers,
        "total_vehicles": total_vehicles,
        "vehicles_in_transit": vehicles_in_transit,
        "vehicles_in_garage": vehicles_in_garage,
        "total_routes": total_routes,
        "total_admins": total_admins
    }

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "School Transport API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
