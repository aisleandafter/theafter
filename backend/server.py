from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
import random
from datetime import datetime, timezone, date
import jwt
import bcrypt
import anthropic
import stripe
import qrcode
from io import BytesIO
from PIL import Image, ImageDraw

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'botanical-serendipity-secret')
JWT_ALGORITHM = "HS256"

# Anthropic client
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Stripe Settings
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
stripe.api_key = STRIPE_API_KEY

# Event pricing
EVENT_PRICE = 49.99

# Local photo storage
PHOTOS_DIR = ROOT_DIR / "photos"
PHOTOS_DIR.mkdir(exist_ok=True)

# ============ PROMO CODES ============

PROMO_CODES = {
    "THEAFTER2026": {"discount_percent": 25, "description": "25% off"},
}

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Serve uploaded photos as static files
app.mount("/photos", StaticFiles(directory=str(PHOTOS_DIR)), name="photos")

# ============ IMAGE HELPERS ============

def crop_circle(image_bytes: bytes) -> bytes:
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    size = min(img.size)
    left = (img.width - size) // 2
    top = (img.height - size) // 2
    img = img.crop((left, top, left + size, top + size))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(img, mask=mask)
    buf = BytesIO()
    output.save(buf, format="PNG")
    return buf.getvalue()

# ============ WEBSOCKET CONNECTION MANAGER ============

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, match_id: str):
        await websocket.accept()
        if match_id not in self.active_connections:
            self.active_connections[match_id] = []
        self.active_connections[match_id].append(websocket)

    def disconnect(self, websocket: WebSocket, match_id: str):
        if match_id in self.active_connections:
            self.active_connections[match_id] = [
                ws for ws in self.active_connections[match_id] if ws != websocket
            ]
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]

    async def broadcast_to_match(self, match_id: str, message: dict):
        if match_id in self.active_connections:
            for ws in self.active_connections[match_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

# ============ MODELS ============

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    is_host: bool = False

class UserLogin(BaseModel):
    email: str
    password: str

class EventCreate(BaseModel):
    bride_name: str
    groom_name: str
    wedding_date: str
    venue: Optional[str] = None

class EventJoin(BaseModel):
    event_code: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    looking_for: Optional[str] = None
    interests: Optional[List[str]] = []
    photo_url: Optional[str] = None
    relationship_to_couple: Optional[str] = None
    fun_fact: Optional[str] = None

class SwipeAction(BaseModel):
    target_user_id: str
    action: str  # 'like' or 'pass'

class MessageSend(BaseModel):
    match_id: str
    content: str

class ConversationStarterRequest(BaseModel):
    match_id: str

class PaymentInitRequest(BaseModel):
    origin_url: str
    promo_code: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ENDPOINTS ============

@app.get("/")
async def home():
    return {"message": "Aisle & After backend is running"}

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "is_host": data.is_host,
        "profile_complete": False,
        "event_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"user": user}

# ============ PAYMENT ENDPOINTS ============

@api_router.post("/promo/validate")
async def validate_promo(data: dict, user=Depends(get_current_user)):
    code = data.get("code", "").upper()
    promo = PROMO_CODES.get(code)
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    discounted_price = round(EVENT_PRICE * (1 - promo["discount_percent"] / 100), 2)
    return {
        "valid": True,
        "code": code,
        "discount_percent": promo["discount_percent"],
        "description": promo["description"],
        "original_price": EVENT_PRICE,
        "final_price": discounted_price
    }

@api_router.post("/payments/checkout")
async def create_checkout(data: PaymentInitRequest, request: Request, user=Depends(get_current_user)):
    if not user.get("is_host"):
        raise HTTPException(status_code=403, detail="Only hosts can purchase event packages")
    existing_payment = await db.payment_transactions.find_one({
        "user_id": user["id"], "payment_status": "paid"
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="You already have an active event package")

    final_price = EVENT_PRICE
    applied_promo = None
    if data.promo_code:
        promo = PROMO_CODES.get(data.promo_code.upper())
        if promo:
            final_price = round(EVENT_PRICE * (1 - promo["discount_percent"] / 100), 2)
            applied_promo = data.promo_code.upper()

    if final_price <= 0:
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": f"promo-{uuid.uuid4()}",
            "user_id": user["id"],
            "user_email": user["email"],
            "amount": 0,
            "currency": "usd",
            "payment_status": "paid",
            "promo_code": applied_promo,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat()
        })
        await db.users.update_one({"id": user["id"]}, {"$set": {"has_paid": True}})
        return {"checkout_url": None, "session_id": None, "paid_free": True}

    success_url = f"{data.origin_url}/admin?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/admin"

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Wedding Event Package - Aisle & After"},
                "unit_amount": int(final_price * 100),
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "user_email": user["email"],
            "product": "wedding_event",
            "promo_code": applied_promo or ""
        }
    )

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.id,
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": final_price,
        "currency": "usd",
        "payment_status": "pending",
        "promo_code": applied_promo,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"checkout_url": session.url, "session_id": session.id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(get_current_user)):
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status == "paid":
        existing = await db.payment_transactions.find_one({"session_id": session_id, "payment_status": "paid"})
        if not existing:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "status": session.status, "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.users.update_one({"id": user["id"]}, {"$set": {"has_paid": True}})
    else:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": session.payment_status, "status": session.status}}
        )
    return {
        "status": session.status,
        "payment_status": session.payment_status,
        "amount": (session.amount_total or 0) / 100,
        "currency": session.currency
    }

@api_router.get("/payments/check")
async def check_payment_status(user=Depends(get_current_user)):
    if not user.get("is_host"):
        return {"has_paid": False}
    paid_transaction = await db.payment_transactions.find_one({"user_id": user["id"], "payment_status": "paid"})
    return {"has_paid": bool(paid_transaction), "price": EVENT_PRICE}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, sig_header, webhook_secret)
        else:
            import json
            event = json.loads(body)
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            if session.get("payment_status") == "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session["id"]},
                    {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
                metadata = session.get("metadata", {})
                if metadata.get("user_id"):
                    await db.users.update_one({"id": metadata["user_id"]}, {"$set": {"has_paid": True}})
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============ EVENT ENDPOINTS ============

def generate_event_code():
    return ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))

async def get_unique_event_code():
    for _ in range(10):
        code = generate_event_code()
        if not await db.events.find_one({"code": code}):
            return code
    return ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=8))

@api_router.post("/events/create")
async def create_event(data: EventCreate, user=Depends(get_current_user)):
    if not user.get("is_host"):
        raise HTTPException(status_code=403, detail="Only hosts can create events")
    paid_transaction = await db.payment_transactions.find_one({"user_id": user["id"], "payment_status": "paid"})
    if not paid_transaction:
        raise HTTPException(status_code=402, detail="Payment required to create an event")
    existing_event = await db.events.find_one({"host_id": user["id"]})
    if existing_event:
        raise HTTPException(status_code=400, detail="You already have an event created")
    event_id = str(uuid.uuid4())
    event_code = await get_unique_event_code()
    event_doc = {
        "id": event_id,
        "code": event_code,
        "host_id": user["id"],
        "bride_name": data.bride_name,
        "groom_name": data.groom_name,
        "wedding_date": data.wedding_date,
        "venue": data.venue,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"event_id": event_id}})
    return {"event": {k: v for k, v in event_doc.items() if k != "_id"}}

@api_router.post("/events/join")
async def join_event(data: EventJoin, user=Depends(get_current_user)):
    event = await db.events.find_one({"code": data.event_code.upper()})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"event_id": event["id"]}})
    return {"event": {k: v for k, v in event.items() if k != "_id"}}

@api_router.get("/events/current")
async def get_current_event(user=Depends(get_current_user)):
    if not user.get("event_id"):
        return {"event": None}
    event = await db.events.find_one({"id": user["event_id"]}, {"_id": 0})
    return {"event": event}

@api_router.get("/events/wedding-day-mode")
async def get_wedding_day_mode(user=Depends(get_current_user)):
    if not user.get("event_id"):
        return {"is_wedding_day": False}
    event = await db.events.find_one({"id": user["event_id"]}, {"_id": 0})
    if not event or not event.get("wedding_date"):
        return {"is_wedding_day": False}
    try:
        is_wedding_day = date.fromisoformat(event["wedding_date"]) == date.today()
    except (ValueError, TypeError):
        is_wedding_day = False
    return {
        "is_wedding_day": is_wedding_day,
        "event_name": f"{event.get('bride_name', '')} & {event.get('groom_name', '')}",
        "wedding_date": event.get("wedding_date")
    }

@api_router.get("/events/live-stats")
async def get_live_stats(user=Depends(get_current_user)):
    event_id = user.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Join an event first")
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    total_guests = await db.users.count_documents({"event_id": event_id, "is_host": False, "profile_complete": True})
    total_matches = await db.matches.count_documents({"event_id": event_id})
    today_matches = await db.matches.find(
        {"event_id": event_id, "created_at": {"$gte": today_start}}, {"_id": 0}
    ).to_list(100)
    recent_match_names = []
    recent = today_matches[-5:]
    if recent:
        all_user_ids = list(set([m["user1_id"] for m in recent] + [m["user2_id"] for m in recent]))
        name_docs = await db.users.find({"id": {"$in": all_user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(len(all_user_ids))
        name_map = {u["id"]: u.get("name", "Guest").split()[0] for u in name_docs}
        for m in recent:
            recent_match_names.append(f"{name_map.get(m['user1_id'], 'Guest')} & {name_map.get(m['user2_id'], 'Guest')}")
    return {
        "total_guests": total_guests,
        "total_matches": total_matches,
        "today_matches": len(today_matches),
        "recent_match_names": recent_match_names
    }

@api_router.get("/events/{event_id}/stats")
async def get_event_stats(event_id: str, user=Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event or event.get("host_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    guest_count = await db.users.count_documents({"event_id": event_id, "is_host": False})
    match_count = await db.matches.count_documents({"event_id": event_id})
    return {"guests": guest_count, "matches": match_count, "event": event}

# ============ PROFILE ENDPOINTS ============

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        update_data["profile_complete"] = True
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"user": updated_user}

@api_router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user=Depends(get_current_user)):
    profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"profile": profile}

# ============ PHOTO UPLOAD ENDPOINTS ============

@api_router.post("/photos/upload")
async def upload_photo(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    try:
        circle_data = crop_circle(data)
    except Exception as e:
        logging.error(f"Crop error: {e}")
        raise HTTPException(status_code=400, detail="Could not process image")
    file_id = str(uuid.uuid4())
    file_path = PHOTOS_DIR / f"{file_id}.png"
    file_path.write_bytes(circle_data)
    await db.files.insert_one({
        "id": file_id,
        "user_id": user["id"],
        "file_path": str(file_path),
        "content_type": "image/png",
        "size": len(circle_data),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    photo_url = f"/photos/{file_id}.png"
    await db.users.update_one({"id": user["id"]}, {"$set": {"photo_url": photo_url}})
    return {"photo_url": photo_url, "file_id": file_id}

# ============ NOTIFICATION ENDPOINTS ============

@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread_count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.post("/notifications/read-all")
async def mark_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"status": "ok"}

# ============ DISCOVERY/SWIPE ENDPOINTS ============

@api_router.get("/discover")
async def discover_profiles(user=Depends(get_current_user)):
    if not user.get("event_id"):
        raise HTTPException(status_code=400, detail="Join an event first")
    swiped = await db.swipes.find({"swiper_id": user["id"]}, {"_id": 0, "target_id": 1}).to_list(1000)
    swiped_ids = [s["target_id"] for s in swiped]
    swiped_ids.append(user["id"])
    looking_for = user.get("looking_for", "everyone")
    query = {
        "event_id": user["event_id"],
        "id": {"$nin": swiped_ids},
        "profile_complete": True,
        "is_host": False
    }
    if looking_for == "men":
        query["gender"] = "male"
    elif looking_for == "women":
        query["gender"] = "female"
    profiles = await db.users.find(query, {"_id": 0, "password": 0}).to_list(50)
    return {"profiles": profiles}

@api_router.post("/swipe")
async def swipe(data: SwipeAction, user=Depends(get_current_user)):
    swipe_doc = {
        "id": str(uuid.uuid4()),
        "swiper_id": user["id"],
        "target_id": data.target_user_id,
        "action": data.action,
        "event_id": user.get("event_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.swipes.insert_one(swipe_doc)
    is_match = False
    match_data = None
    if data.action == "like":
        mutual = await db.swipes.find_one({
            "swiper_id": data.target_user_id, "target_id": user["id"], "action": "like"
        })
        if mutual:
            is_match = True
            match_id = str(uuid.uuid4())
            match_doc = {
                "id": match_id,
                "user1_id": user["id"],
                "user2_id": data.target_user_id,
                "event_id": user.get("event_id"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.matches.insert_one(match_doc)
            matched_user = await db.users.find_one({"id": data.target_user_id}, {"_id": 0, "password": 0})
            match_data = {"match_id": match_id, "matched_user": matched_user}
            now = datetime.now(timezone.utc).isoformat()
            await db.notifications.insert_many([
                {
                    "id": str(uuid.uuid4()), "user_id": user["id"], "type": "match",
                    "title": "New Match!", "message": f"You matched with {matched_user.get('name', 'someone')}!",
                    "match_id": match_id, "read": False, "created_at": now
                },
                {
                    "id": str(uuid.uuid4()), "user_id": data.target_user_id, "type": "match",
                    "title": "New Match!", "message": f"You matched with {user.get('name', 'someone')}!",
                    "match_id": match_id, "read": False, "created_at": now
                }
            ])
    return {"success": True, "is_match": is_match, "match": match_data}

# ============ MATCHES ENDPOINTS ============

@api_router.get("/matches")
async def get_matches(user=Depends(get_current_user)):
    matches = await db.matches.find({
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    }, {"_id": 0}).to_list(100)
    other_ids = [m["user2_id"] if m["user1_id"] == user["id"] else m["user1_id"] for m in matches]
    match_ids = [m["id"] for m in matches]
    users_list = await db.users.find({"id": {"$in": other_ids}}, {"_id": 0, "password": 0}).to_list(len(other_ids))
    users_map = {u["id"]: u for u in users_list}
    last_msgs = await db.messages.aggregate([
        {"$match": {"match_id": {"$in": match_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$match_id", "doc": {"$first": "$$ROOT"}}}
    ]).to_list(len(match_ids))
    msgs_map = {m["_id"]: {k: v for k, v in m["doc"].items() if k != "_id"} for m in last_msgs}
    result = []
    for match in matches:
        other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
        result.append({
            "match_id": match["id"],
            "matched_user": users_map.get(other_id),
            "created_at": match["created_at"],
            "last_message": msgs_map.get(match["id"])
        })
    return {"matches": result}

# ============ CHAT ENDPOINTS ============

@api_router.get("/chat/{match_id}")
async def get_messages(match_id: str, user=Depends(get_current_user)):
    match = await db.matches.find_one({
        "id": match_id, "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    messages = await db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": messages}

@api_router.post("/chat/send")
async def send_message(data: MessageSend, user=Depends(get_current_user)):
    match = await db.matches.find_one({
        "id": data.match_id, "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    message_doc = {
        "id": str(uuid.uuid4()), "match_id": data.match_id,
        "sender_id": user["id"], "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message_doc)
    msg_response = {k: v for k, v in message_doc.items() if k != "_id"}
    await ws_manager.broadcast_to_match(data.match_id, {"type": "new_message", "message": msg_response})
    return {"message": msg_response}

# ============ WEBSOCKET ENDPOINT ============

@app.websocket("/ws/chat/{match_id}")
async def websocket_chat(websocket: WebSocket, match_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            await websocket.close(code=4001)
            return
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        await websocket.close(code=4001)
        return
    match = await db.matches.find_one({
        "id": match_id, "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        await websocket.close(code=4003)
        return
    await ws_manager.connect(websocket, match_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, match_id)

# ============ AI ENDPOINTS ============

@api_router.post("/ai/conversation-starters")
async def get_conversation_starters(data: ConversationStarterRequest, user=Depends(get_current_user)):
    match = await db.matches.find_one({
        "id": data.match_id, "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
    other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0})
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    try:
        prompt = f"""Generate conversation starters for:
Person 1: {current_user.get('name', 'Guest')}, interests: {', '.join(current_user.get('interests', []))}, fun fact: {current_user.get('fun_fact', 'N/A')}
Person 2: {other_user.get('name', 'Guest')}, interests: {', '.join(other_user.get('interests', []))}, fun fact: {other_user.get('fun_fact', 'N/A')}
They're both attending the same wedding."""
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=300,
            system="You are a friendly matchmaker at a wedding. Generate 3 creative, fun conversation starters for two guests who just matched. Keep them light, romantic, and wedding-themed. Return only the 3 starters as a numbered list, nothing else.",
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text
        lines = [l.strip() for l in response_text.split('\n') if l.strip() and l.strip()[0].isdigit()]
        starters = [l.split('.', 1)[1].strip() if '.' in l else l for l in lines[:3]]
        return {"starters": starters}
    except Exception as e:
        logging.error(f"AI error: {e}")
        return {"starters": [
            "I noticed we're both friends of the happy couple! How do you know them?",
            "What's your favorite wedding memory so far?",
            "If you could give the newlyweds one piece of advice, what would it be?"
        ]}

@api_router.post("/ai/compatibility")
async def analyze_compatibility(data: ConversationStarterRequest, user=Depends(get_current_user)):
    match = await db.matches.find_one({
        "id": data.match_id, "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
    other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0})
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    try:
        prompt = f"""Analyze compatibility:
Person 1: {current_user.get('name')}, {current_user.get('age', 'unknown age')}, interests: {current_user.get('interests', [])}, bio: {current_user.get('bio', 'N/A')}
Person 2: {other_user.get('name')}, {other_user.get('age', 'unknown age')}, interests: {other_user.get('interests', [])}, bio: {other_user.get('bio', 'N/A')}"""
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=200,
            system="You are a romantic matchmaker. Analyze compatibility between two wedding guests. Be positive, fun, and romantic. Keep response under 100 words.",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"analysis": message.content[0].text}
    except Exception as e:
        logging.error(f"AI error: {e}")
        return {"analysis": "You both share a love for celebration and good company - the perfect recipe for wedding magic!"}

# ============ BOUQUET TOSS ============

@api_router.post("/bouquet-toss")
async def bouquet_toss(user=Depends(get_current_user)):
    event_id = user.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Join an event first")
    already_tossed = await db.bouquet_tosses.find_one({"user_id": user["id"], "event_id": event_id})
    if already_tossed:
        raise HTTPException(status_code=400, detail="You've already used your bouquet toss!")
    existing_matches = await db.matches.find({
        "event_id": event_id,
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    }, {"_id": 0, "user1_id": 1, "user2_id": 1}).to_list(1000)
    matched_ids = set()
    for m in existing_matches:
        matched_ids.add(m["user1_id"])
        matched_ids.add(m["user2_id"])
    matched_ids.add(user["id"])
    candidates = await db.users.find({
        "event_id": event_id, "id": {"$nin": list(matched_ids)},
        "profile_complete": True, "is_host": False
    }, {"_id": 0, "password": 0}).to_list(500)
    if not candidates:
        raise HTTPException(status_code=404, detail="No available guests for a bouquet toss right now")
    chosen = random.choice(candidates)
    match_id = str(uuid.uuid4())
    await db.matches.insert_one({
        "id": match_id, "user1_id": user["id"], "user2_id": chosen["id"],
        "event_id": event_id, "is_bouquet_toss": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.bouquet_tosses.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "event_id": event_id,
        "matched_user_id": chosen["id"], "match_id": match_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"match_id": match_id, "matched_user": chosen}

# ============ COUNTDOWN ENDPOINTS ============

@api_router.get("/countdown/{event_code}")
async def get_countdown(event_code: str):
    event = await db.events.find_one({"code": event_code.upper()}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    wedding_date_str = event.get("wedding_date")
    if not wedding_date_str:
        raise HTTPException(status_code=400, detail="No wedding date set")
    try:
        wedding_dt = datetime.fromisoformat(wedding_date_str + "T00:00:00+00:00")
        now = datetime.now(timezone.utc)
        total_seconds = max(int((wedding_dt - now).total_seconds()), 0)
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        is_past = total_seconds == 0
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid wedding date")
    guest_count = await db.users.count_documents({"event_id": event["id"], "is_host": False, "profile_complete": True})
    match_count = await db.matches.count_documents({"event_id": event["id"]})
    return {
        "event_name": f"{event.get('bride_name', '')} & {event.get('groom_name', '')}",
        "wedding_date": wedding_date_str,
        "venue": event.get("venue"),
        "countdown": {"days": days, "hours": hours, "minutes": minutes, "seconds": seconds},
        "is_wedding_day": days == 0 and not is_past,
        "is_past": is_past,
        "guests_joined": guest_count,
        "matches_made": match_count,
        "event_code": event["code"]
    }

@api_router.get("/countdown/{event_code}/qr")
async def get_countdown_qr(event_code: str, request: Request):
    event = await db.events.find_one({"code": event_code.upper()}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    origin = str(request.headers.get("origin", request.base_url)).rstrip("/")
    countdown_url = f"{origin}/countdown/{event_code.upper()}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(countdown_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")

# ============ HEALTH ============

@api_router.get("/health")
async def health():
    return {"message": "aisle & after API", "status": "healthy"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
