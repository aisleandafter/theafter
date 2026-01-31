from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'botanical-serendipity-secret')
JWT_ALGORITHM = "HS256"

# LLM Settings
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Stripe Settings
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Event pricing - fixed on backend
EVENT_PRICE = 49.99  # One-time payment for event creation

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

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

class PaymentStatusRequest(BaseModel):
    session_id: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
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
async def get_me(user = Depends(get_current_user)):
    return {"user": user}

# ============ PAYMENT ENDPOINTS ============

@api_router.post("/payments/checkout")
async def create_checkout(data: PaymentInitRequest, request: Request, user = Depends(get_current_user)):
    if not user.get("is_host"):
        raise HTTPException(status_code=403, detail="Only hosts can purchase event packages")
    
    # Check if user already has a paid event
    existing_payment = await db.payment_transactions.find_one({
        "user_id": user["id"],
        "payment_status": "paid"
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="You already have an active event package")
    
    # Initialize Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{data.origin_url}/admin?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/admin"
    
    checkout_request = CheckoutSessionRequest(
        amount=EVENT_PRICE,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "user_email": user["email"],
            "product": "wedding_event"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": EVENT_PRICE,
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user = Depends(get_current_user)):
    # Initialize Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Get status from Stripe
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction in database
    if status.payment_status == "paid":
        # Check if already processed
        existing = await db.payment_transactions.find_one({
            "session_id": session_id,
            "payment_status": "paid"
        })
        
        if not existing:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": status.status,
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Mark user as having paid
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"has_paid": True}}
            )
    else:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status
            }}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,  # Convert cents to dollars
        "currency": status.currency
    }

@api_router.get("/payments/check")
async def check_payment_status(user = Depends(get_current_user)):
    """Check if user has paid for event creation"""
    if not user.get("is_host"):
        return {"has_paid": False}
    
    # Check if user has paid
    paid_transaction = await db.payment_transactions.find_one({
        "user_id": user["id"],
        "payment_status": "paid"
    })
    
    return {"has_paid": bool(paid_transaction), "price": EVENT_PRICE}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Mark user as having paid
            if webhook_response.metadata and "user_id" in webhook_response.metadata:
                await db.users.update_one(
                    {"id": webhook_response.metadata["user_id"]},
                    {"$set": {"has_paid": True}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============ EVENT ENDPOINTS ============

def generate_event_code():
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def get_unique_event_code():
    """Generate a unique event code, retrying if collision occurs"""
    max_attempts = 10
    for _ in range(max_attempts):
        code = generate_event_code()
        existing = await db.events.find_one({"code": code})
        if not existing:
            return code
    # Fallback: use longer code if too many collisions
    return ''.join(__import__('random').choices(__import__('string').ascii_uppercase + __import__('string').digits, k=8))

@api_router.post("/events/create")
async def create_event(data: EventCreate, user = Depends(get_current_user)):
    if not user.get("is_host"):
        raise HTTPException(status_code=403, detail="Only hosts can create events")
    
    # Check if user has paid
    paid_transaction = await db.payment_transactions.find_one({
        "user_id": user["id"],
        "payment_status": "paid"
    })
    if not paid_transaction:
        raise HTTPException(status_code=402, detail="Payment required to create an event")
    
    # Check if user already has an event
    existing_event = await db.events.find_one({"host_id": user["id"]})
    if existing_event:
        raise HTTPException(status_code=400, detail="You already have an event created")
    
    event_id = str(uuid.uuid4())
    event_code = generate_event_code()
    
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
async def join_event(data: EventJoin, user = Depends(get_current_user)):
    event = await db.events.find_one({"code": data.event_code.upper()})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"event_id": event["id"]}})
    return {"event": {k: v for k, v in event.items() if k != "_id"}}

@api_router.get("/events/current")
async def get_current_event(user = Depends(get_current_user)):
    if not user.get("event_id"):
        return {"event": None}
    
    event = await db.events.find_one({"id": user["event_id"]}, {"_id": 0})
    return {"event": event}

@api_router.get("/events/{event_id}/stats")
async def get_event_stats(event_id: str, user = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event or event.get("host_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    guest_count = await db.users.count_documents({"event_id": event_id, "is_host": False})
    match_count = await db.matches.count_documents({"event_id": event_id})
    
    return {
        "guests": guest_count,
        "matches": match_count,
        "event": event
    }

# ============ PROFILE ENDPOINTS ============

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        update_data["profile_complete"] = True
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"user": updated_user}

@api_router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user = Depends(get_current_user)):
    profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"profile": profile}

# ============ DISCOVERY/SWIPE ENDPOINTS ============

@api_router.get("/discover")
async def discover_profiles(user = Depends(get_current_user)):
    if not user.get("event_id"):
        raise HTTPException(status_code=400, detail="Join an event first")
    
    # Get users already swiped on
    swiped = await db.swipes.find({"swiper_id": user["id"]}).to_list(1000)
    swiped_ids = [s["target_id"] for s in swiped]
    swiped_ids.append(user["id"])  # Exclude self
    
    # Get matching preference
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
async def swipe(data: SwipeAction, user = Depends(get_current_user)):
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
    
    # Check for mutual like
    if data.action == "like":
        mutual = await db.swipes.find_one({
            "swiper_id": data.target_user_id,
            "target_id": user["id"],
            "action": "like"
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
            
            # Get matched user info
            matched_user = await db.users.find_one({"id": data.target_user_id}, {"_id": 0, "password": 0})
            match_data = {
                "match_id": match_id,
                "matched_user": matched_user
            }
    
    return {"success": True, "is_match": is_match, "match": match_data}

# ============ MATCHES ENDPOINTS ============

@api_router.get("/matches")
async def get_matches(user = Depends(get_current_user)):
    matches = await db.matches.find({
        "$or": [
            {"user1_id": user["id"]},
            {"user2_id": user["id"]}
        ]
    }, {"_id": 0}).to_list(100)
    
    result = []
    for match in matches:
        other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
        other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0})
        
        # Get last message
        last_msg = await db.messages.find_one(
            {"match_id": match["id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        result.append({
            "match_id": match["id"],
            "matched_user": other_user,
            "created_at": match["created_at"],
            "last_message": last_msg
        })
    
    return {"matches": result}

# ============ CHAT ENDPOINTS ============

@api_router.get("/chat/{match_id}")
async def get_messages(match_id: str, user = Depends(get_current_user)):
    # Verify user is part of match
    match = await db.matches.find_one({
        "id": match_id,
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find(
        {"match_id": match_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    return {"messages": messages}

@api_router.post("/chat/send")
async def send_message(data: MessageSend, user = Depends(get_current_user)):
    # Verify user is part of match
    match = await db.matches.find_one({
        "id": data.match_id,
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message_doc = {
        "id": str(uuid.uuid4()),
        "match_id": data.match_id,
        "sender_id": user["id"],
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message_doc)
    
    return {"message": {k: v for k, v in message_doc.items() if k != "_id"}}

# ============ AI ENDPOINTS ============

@api_router.post("/ai/conversation-starters")
async def get_conversation_starters(data: ConversationStarterRequest, user = Depends(get_current_user)):
    # Get match and other user
    match = await db.matches.find_one({
        "id": data.match_id,
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
    other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0})
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"starters-{data.match_id}",
            system_message="You are a friendly matchmaker at a wedding. Generate 3 creative, fun conversation starters for two guests who just matched. Keep them light, romantic, and wedding-themed. Return only the 3 starters as a numbered list, nothing else."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""Generate conversation starters for:
Person 1: {current_user.get('name', 'Guest')}, interests: {', '.join(current_user.get('interests', []))}, fun fact: {current_user.get('fun_fact', 'N/A')}
Person 2: {other_user.get('name', 'Guest')}, interests: {', '.join(other_user.get('interests', []))}, fun fact: {other_user.get('fun_fact', 'N/A')}
They're both attending the same wedding."""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response into list
        lines = [l.strip() for l in response.split('\n') if l.strip() and l.strip()[0].isdigit()]
        starters = [l.split('.', 1)[1].strip() if '.' in l else l for l in lines[:3]]
        
        return {"starters": starters}
    except Exception as e:
        logging.error(f"AI error: {e}")
        # Fallback starters
        return {"starters": [
            f"I noticed we're both friends of the happy couple! How do you know them?",
            f"What's your favorite wedding memory so far?",
            f"If you could give the newlyweds one piece of advice, what would it be?"
        ]}

@api_router.post("/ai/compatibility")
async def analyze_compatibility(data: ConversationStarterRequest, user = Depends(get_current_user)):
    match = await db.matches.find_one({
        "id": data.match_id,
        "$or": [{"user1_id": user["id"]}, {"user2_id": user["id"]}]
    })
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    other_id = match["user2_id"] if match["user1_id"] == user["id"] else match["user1_id"]
    other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password": 0})
    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"compat-{data.match_id}",
            system_message="You are a romantic matchmaker. Analyze compatibility between two wedding guests. Be positive, fun, and romantic. Keep response under 100 words."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""Analyze compatibility:
Person 1: {current_user.get('name')}, {current_user.get('age', 'unknown age')}, interests: {current_user.get('interests', [])}, bio: {current_user.get('bio', 'N/A')}
Person 2: {other_user.get('name')}, {other_user.get('age', 'unknown age')}, interests: {other_user.get('interests', [])}, bio: {other_user.get('bio', 'N/A')}"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {"analysis": response}
    except Exception as e:
        logging.error(f"AI error: {e}")
        return {"analysis": "You both share a love for celebration and good company - the perfect recipe for wedding magic! Your shared interests could spark something wonderful."}

# ============ ROOT ============

@api_router.get("/")
async def root():
    return {"message": "Botanical Serendipity API"}

# Include router
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
