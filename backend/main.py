import os
import gc
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

print("Loading ML models...")
try:
    xgb_model = joblib.load("model.pkl")
    feature_names = joblib.load("feature_names.pkl")
    explainer = joblib.load("shap_explainer.pkl")
    with open("encoders.json") as f:
        encoders = json.load(f)
    print("Models loaded successfully!")
except Exception as e:
    print(f"Models failed to load: {e}")
    print("Retraining XGBoost model from scratch...")
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBRegressor
    import shap

    train_df = pd.read_csv("cars_decoded.csv")
    print(f"Columns found: {train_df.columns.tolist()}")
    train_df = train_df.dropna(axis=1, how='all')

    if 'price' not in train_df.columns:
        raise ValueError("Missing required column: price")

    if 'year' not in train_df.columns:
        train_df['year'] = 2015
    if 'odometer' not in train_df.columns:
        train_df['odometer'] = 50000

    train_df['car_age'] = 2024 - pd.to_numeric(train_df['year'], errors='coerce').fillna(2015)
    train_df['miles_per_year'] = pd.to_numeric(train_df['odometer'], errors='coerce').fillna(50000) / (train_df['car_age'] + 1)
    train_df['is_luxury'] = 0
    train_df['is_clean_title'] = 1

    possible_cat_cols = ['manufacturer', 'condition', 'cylinders', 'fuel',
                         'transmission', 'drive', 'type', 'paint_color', 'state']
    cat_cols = [c for c in possible_cat_cols if c in train_df.columns]

    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        train_df[col] = le.fit_transform(train_df[col].astype(str))
        encoders[col] = list(le.classes_)

    with open("encoders.json", "w") as f:
        json.dump(encoders, f)

    all_possible_features = ['year', 'manufacturer', 'condition', 'cylinders',
                             'fuel', 'odometer', 'transmission', 'drive',
                             'type', 'paint_color', 'state', 'car_age',
                             'miles_per_year', 'is_luxury', 'is_clean_title']
    feature_names = [f for f in all_possible_features if f in train_df.columns]

    train_df = train_df.dropna(subset=['price'])
    train_df['price'] = pd.to_numeric(train_df['price'], errors='coerce')
    train_df = train_df.dropna(subset=['price'])
    train_df = train_df[(train_df['price'] >= 500) & (train_df['price'] <= 100000)]

    X = train_df[feature_names].fillna(0)
    y = train_df['price']

    # Use only 50% of data to save memory
    X = X.sample(frac=0.5, random_state=42)
    y = y.loc[X.index]

    print(f"Training on {len(X):,} samples")

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

    del train_df, X, y, X_train, X_test, y_train, y_test
    gc.collect()

# Load only needed columns to save memory
needed_cols = ['manufacturer', 'year', 'odometer', 'condition',
               'fuel', 'price', 'state', 'transmission']
df = pd.read_csv("cars_decoded.csv", usecols=needed_cols)
print(f"Loaded {len(df):,} cars!")
gc.collect()

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

@app.api_route("/", methods=["GET", "HEAD"])
def home():
    return {"message": "AutoSense AI API running!"}

@app.api_route("/stats", methods=["GET", "HEAD"])
def get_stats():
    return {
        "total_listings": int(len(df)),
        "avg_price": float(round(pd.to_numeric(df['price'], errors='coerce').mean(), 0)),
        "median_price": float(round(pd.to_numeric(df['price'], errors='coerce').median(), 0)),
        "top_manufacturer": str(df['manufacturer'].mode()[0]) if 'manufacturer' in df.columns else "ford",
        "price_range": {
            "min": float(round(pd.to_numeric(df['price'], errors='coerce').min(), 0)),
            "max": float(round(pd.to_numeric(df['price'], errors='coerce').max(), 0))
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

    all_possible = {
        'year': req.year,
        'manufacturer': encode_val('manufacturer', req.manufacturer),
        'condition': encode_val('condition', req.condition),
        'cylinders': encode_val('cylinders', req.cylinders),
        'fuel': encode_val('fuel', req.fuel),
        'odometer': req.odometer,
        'transmission': encode_val('transmission', req.transmission),
        'drive': encode_val('drive', req.drive),
        'type': encode_val('type', req.type),
        'paint_color': encode_val('paint_color', req.paint_color),
        'state': encode_val('state', req.state),
        'car_age': car_age,
        'miles_per_year': miles_per_year,
        'is_luxury': is_luxury,
        'is_clean_title': is_clean_title
    }

    features = [all_possible.get(f, 0) for f in feature_names]
    features_array = np.array(features).reshape(1, -1)

    predicted_price = round(float(xgb_model.predict(features_array)[0]), 0)
    confidence_low = round(predicted_price * 0.88, 0)
    confidence_high = round(predicted_price * 1.12, 0)

    try:
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
    except Exception:
        shap_data = []

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
    if manufacturer and 'manufacturer' in result.columns:
        result = result[result['manufacturer'].astype(str).str.lower() == manufacturer.lower()]
    if min_price:
        result = result[pd.to_numeric(result['price'], errors='coerce') >= min_price]
    if max_price:
        result = result[pd.to_numeric(result['price'], errors='coerce') <= max_price]
    if len(result) > 0:
        result = result.sample(min(limit, len(result)))
    cols = [c for c in needed_cols if c in result.columns]
    return result[cols].fillna('unknown').to_dict(orient='records')

@app.get("/market/stats")
def market_stats():
    result = {}
    if 'manufacturer' in df.columns:
        mfr_stats = df.groupby('manufacturer')['price'].agg(['mean', 'count']).round(0)
        mfr_stats = mfr_stats.sort_values('mean', ascending=False).head(10)
        result["by_manufacturer"] = mfr_stats.reset_index().to_dict(orient='records')
    if 'condition' in df.columns:
        result["by_condition"] = df.groupby('condition')['price'].mean().round(0).to_dict()
    if 'year' in df.columns:
        result["by_year"] = df.groupby('year')['price'].mean().round(0).tail(10).to_dict()
    return result

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
        "avg_price": round(float(pd.to_numeric(df['price'], errors='coerce').mean()), 0),
        "top_manufacturer": str(df['manufacturer'].mode()[0]) if 'manufacturer' in df.columns else "ford",
    })

@tool
def search_cars_by_budget(min_price: float, max_price: float) -> str:
    """Search cars within a price range budget."""
    prices = pd.to_numeric(df['price'], errors='coerce')
    result = df[(prices >= min_price) & (prices <= max_price)]
    count = int(len(result))
    avg_price = round(float(pd.to_numeric(result['price'], errors='coerce').mean()), 0) if count > 0 else 0
    return f"Found {count:,} cars between ${min_price:,.0f}-${max_price:,.0f}. Average: ${avg_price:,.0f}"

@tool
def get_brand_info(manufacturer: str) -> str:
    """Get price and listing info for a specific car manufacturer."""
    if 'manufacturer' not in df.columns:
        return "Manufacturer data not available"
    brand_data = df[df['manufacturer'].astype(str).str.lower() == manufacturer.lower()]
    if len(brand_data) == 0:
        return f"No data found for {manufacturer}"
    return json.dumps({
        "manufacturer": manufacturer,
        "total_listings": int(len(brand_data)),
        "avg_price": round(float(pd.to_numeric(brand_data['price'], errors='coerce').mean()), 0),
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