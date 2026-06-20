print("Loading ML models...")
try:
    xgb_model = joblib.load("model.pkl")
    lgbm_model = joblib.load("lgbm_model.pkl")
    explainer = joblib.load("shap_explainer.pkl")
    feature_names = joblib.load("feature_names.pkl")
    print(f"Models loaded successfully!")
except Exception as e:
    print(f"Models failed to load: {e}")
    print("Retraining models...")
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBRegressor
    from lightgbm import LGBMRegressor
    import shap

    train_df = pd.read_csv("cars_decoded.csv")
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
    train_df['is_luxury'] = train_df['manufacturer'].isin([18, 2, 0, 22, 30]).astype(int)
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

    lgbm_model = LGBMRegressor(
        n_estimators=100, max_depth=6,
        learning_rate=0.1, random_state=42,
        n_jobs=-1, verbose=-1)
    lgbm_model.fit(X_train, y_train)

    explainer = shap.TreeExplainer(xgb_model)

    joblib.dump(xgb_model, "model.pkl")
    joblib.dump(lgbm_model, "lgbm_model.pkl")
    joblib.dump(explainer, "shap_explainer.pkl")
    joblib.dump(feature_names, "feature_names.pkl")
    print("Models retrained and saved!")