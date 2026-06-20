import os
import json
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, Annotated
from typing_extensions import TypedDict
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db, engine
from models import Base, User, SavedCar
from auth import hash_password, verify_password, create_access_token, decode_token

from langchain_groq import ChatGroq
from langchain.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage

load_dotenv()
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")

Base.metadata.create_all(bind=engine)
print("Database tables created!")

app = FastAPI(title="AutoSense AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

print("Loading ML models...")
try:
    xgb_model = joblib.load("model.pkl")
    feature_names = joblib.load("feature_names.pkl")
    explainer = joblib.load("shap_explainer.pkl")
    print("Models loaded successfully!")
except Exception as e:
    print(f"Models failed to load: {e}")
    print("Retraining XGBoost model from scratch...")
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBRegressor
    import shap

    train_df = pd.read_csv("cars_decoded.csv")
    print(f"Loaded {len(train_df):,} cars for training")

    cat_cols = ['manufacturer', 'condition', 'cylinders', 'fuel',
                'transmission', 'drive', 'type', 'paint_color', 'state']

    encoders_dict = {}
    for col in cat_cols:
        le = LabelEncoder()
        train_df[col] = le.fit_transform(train_df[col].astype(str))
        encoders_dict[col] = list(le.classes_)

    with open("encoders.json", "w") as f:
        json.dump(encoders_dict, f)

    train_df['car_age'] = 2024 - train_df['year']
    train_df['miles_per_year'] = train_df['odometer'] / (train_df['car_age'] + 1)
    train_df['is_luxury'] = 0
    train_df['is_clean_title'] = 1

    feature_names = ['year', 'manufacturer', 'condition', 'cylinders',
                     'fuel', 'odometer', 'transmission', 'drive',
                     'type', 'paint_color', 'state', 'car_age',
                     'miles_per_year', 'is_luxury', 'is_clean_title']

    X = train_df[feature_names]
    y = train_df['price']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42)

    xgb_model = XGBRegressor(
        n_estimators=100, max_depth=6,
        learning_rate=0.1, random_state=42, n_jobs=-1)
    xgb_model.fit(X_train, y_train)
    print("XGBoost trained!")

    explainer = shap.TreeExplainer(xgb_model)

    joblib.dump(xgb_model, "model.pkl")
    joblib.dump(feature_names, "feature_names.pkl")
    joblib.dump(explainer, "shap_explainer.pkl")
    print("Models saved!")

with open("encoders.json") as f:
    encoders = json.load(f)

df = pd.read_csv("cars_decoded.csv")
print(f"Loaded {len(df):,} cars!")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

class PredictRequest(BaseModel):
    manufacturer: str = "toyota"
    year: int = 2019
    odometer: int = 45000
    condition: str = "excellent"
    fuel: str = "gas"
    transmission: str = "automatic"
    drive: str = "fwd"
    cylinders: str = "6 cylinders"
    type: str = "sedan"
    paint_color: str = "white"
    state: str = "ca"
    title_status: str = "clean"

class SaveCarRequest(BaseModel):
    manufacturer: str
    model_name: str
    year: int
    odometer: int
    condition: str
    price: float
    predicted_price: Optional[float] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.get("/")
def home():
    return {"message": "AutoSense AI API running!"}

@app.get("/stats")
def get_stats():
    return {
        "total_listings": int(len(df)),
        "avg_price": float(round(df['price'].mean(), 0)),
        "median_price": float(round(df['price'].median(), 0)),
        "top_manufacturer": str(df['manufacturer'].mode()[0]),
        "price_range": {
            "min": float(round(df['price'].min(), 0)),
            "max": float(round(df['price'].max(), 0))
        }
    }

@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        username=req.username,
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "username": user.username}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "username": user.username}

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
    }

@app.post("/predict")
def predict(req: PredictRequest):
    car_age = 2024 - req.year
    miles_per_year = req.odometer / (car_age + 1)
    luxury_brands = ['bmw', 'mercedes-benz', 'audi', 'lexus', 'porsche', 'cadillac']
    is_luxury = 1 if req.manufacturer.lower() in luxury_brands else 0
    is_clean_title = 1 if req.title_status.lower() == 'clean' else 0

    def encode_val(col, val):
        classes = encoders.get(col, [])
        val = str(val).lower()
        return classes.index(val) if val in classes else 0

    features = [
        req.year,
        encode_val('manufacturer', req.manufacturer),
        encode_val('condition', req.condition),
        encode_val('cylinders', req.cylinders),
        encode_val('fuel', req.fuel),
        req.odometer,
        encode_val('transmission', req.transmission),
        encode_val('drive', req.drive),
        encode_val('type', req.type),
        encode_val('paint_color', req.paint_color),
        encode_val('state', req.state),
        car_age,
        miles_per_year,
        is_luxury,
        is_clean_title
    ]

    features_array = np.array(features).reshape(1, -1)
    predicted_price = round(float(xgb_model.predict(features_array)[0]), 0)
    confidence_low = round(predicted_price * 0.88, 0)
    confidence_high = round(predicted_price * 1.12, 0)

    raw_shap = explainer.shap_values(features_array)
    if isinstance(raw_shap, list):
        shap_vals = raw_shap[0]
    else:
        shap_vals = raw_shap
    shap_vals = shap_vals.flatten()

    shap_data = []
    for i, fname in enumerate(feature_names):
        shap_data.append({
            "feature": fname,
            "value": round(float(features[i]), 2),
            "shap_value": round(float(shap_vals[i]), 2),
            "impact": "increases_price" if shap_vals[i] > 0 else "decreases_price"
        })
    shap_data.sort(key=lambda x: abs(x['shap_value']), reverse=True)

    return {
        "predicted_price": predicted_price,
        "confidence_low": confidence_low,
        "confidence_high": confidence_high,
        "manufacturer": req.manufacturer,
        "year": req.year,
        "top_factors": shap_data[:5],
    }

@app.get("/market/listings")
def get_listings(
    manufacturer: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 20
):
    result = df.copy()
    if manufacturer:
        result = result[result['manufacturer'].astype(str).str.lower() == manufacturer.lower()]
    if min_price:
        result = result[result['price'] >= min_price]
    if max_price:
        result = result[result['price'] <= max_price]
    result = result.sample(min(limit, len(result)))
    cols = ['manufacturer', 'year', 'odometer', 'condition', 'fuel', 'price', 'state', 'transmission']
    cols = [c for c in cols if c in result.columns]
    return result[cols].fillna('unknown').to_dict(orient='records')

@app.get("/market/stats")
def market_stats():
    mfr_stats = df.groupby('manufacturer')['price'].agg(['mean', 'count']).round(0)
    mfr_stats = mfr_stats.sort_values('mean', ascending=False).head(10)
    return {
        "by_manufacturer": mfr_stats.reset_index().to_dict(orient='records'),
        "by_condition": df.groupby('condition')['price'].mean().round(0).to_dict(),
        "by_year": df.groupby('year')['price'].mean().round(0).tail(10).to_dict()
    }

@app.get("/garage")
def get_garage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cars = db.query(SavedCar).filter(SavedCar.user_id == current_user.id).all()
    return [{"id": c.id, "manufacturer": c.manufacturer, "model_name": c.model_name,
             "year": c.year, "odometer": c.odometer, "condition": c.condition,
             "price": c.price, "predicted_price": c.predicted_price,
             "image_url": c.image_url, "notes": c.notes} for c in cars]

@app.post("/garage")
def save_car(req: SaveCarRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    car = SavedCar(user_id=current_user.id, **req.dict())
    db.add(car)
    db.commit()
    return {"message": "Car saved!", "id": car.id}

@app.delete("/garage/{car_id}")
def delete_car(car_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    car = db.query(SavedCar).filter(SavedCar.id == car_id, SavedCar.user_id == current_user.id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    db.delete(car)
    db.commit()
    return {"message": "Car deleted!"}

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.7)

@tool
def get_market_overview() -> str:
    """Get overall car market statistics and average prices."""
    return json.dumps({
        "total_listings": int(len(df)),
        "avg_price": round(float(df['price'].mean()), 0),
        "median_price": round(float(df['price'].median()), 0),
        "top_manufacturer": str(df['manufacturer'].mode()[0]),
        "price_range": f"${df['price'].min():,.0f} - ${df['price'].max():,.0f}"
    })

@tool
def search_cars_by_budget(min_price: float, max_price: float) -> str:
    """Search cars within a price range budget."""
    result = df[(df['price'] >= min_price) & (df['price'] <= max_price)]
    count = int(len(result))
    avg_price = round(float(result['price'].mean()), 0) if count > 0 else 0
    top_brands = result.groupby('manufacturer')['price'].count().sort_values(ascending=False).head(5)
    return f"Found {count:,} cars between ${min_price:,.0f}-${max_price:,.0f}. Average: ${avg_price:,.0f}. Top brands: {list(top_brands.index)}"

@tool
def get_brand_info(manufacturer: str) -> str:
    """Get price and listing info for a specific car manufacturer."""
    brand_data = df[df['manufacturer'].astype(str).str.lower() == manufacturer.lower()]
    if len(brand_data) == 0:
        return f"No data found for {manufacturer}"
    return json.dumps({
        "manufacturer": manufacturer,
        "total_listings": int(len(brand_data)),
        "avg_price": round(float(brand_data['price'].mean()), 0),
        "median_price": round(float(brand_data['price'].median()), 0),
        "avg_odometer": round(float(brand_data['odometer'].mean()), 0),
    })

tools = [get_market_overview, search_cars_by_budget, get_brand_info]
llm_with_tools = llm.bind_tools(tools)

class ChatState(TypedDict):
    messages: Annotated[list, add_messages]

def agent_node(state: ChatState) -> dict:
    messages = [SystemMessage(content="""You are AutoSense AI — an expert automotive assistant.
You help users with car buying advice, price analysis, maintenance tips, and market insights.
Use tools to get real market data. Be specific with prices and numbers.
Always be helpful, friendly, and concise.""")] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

tool_node = ToolNode(tools)

def should_continue(state: ChatState) -> str:
    if state["messages"][-1].tool_calls:
        return "tools"
    return END

builder = StateGraph(ChatState)
builder.add_node("agent", agent_node)
builder.add_node("tools", tool_node)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", should_continue)
builder.add_edge("tools", "agent")

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)

@app.post("/chat")
async def chat(req: ChatRequest):
    config = {"configurable": {"thread_id": req.session_id}}
    result = graph.invoke(
        {"messages": [("user", req.message)]},
        config=config
    )
    return {"response": result["messages"][-1].content}