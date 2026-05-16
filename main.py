import os 
import numpy as np
import pandas as pd
from typing import Optional
from PIL import Image
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model as keras_load_model
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from io import BytesIO
import joblib
import google.generativeai as genai
import json

# Load environment variables
load_dotenv()

# Configure Gemini AI
api_key = os.getenv("API_KEY")
if api_key is None:
    raise ValueError("API_KEY environment variable is not set")
genai.configure(api_key=api_key)

# Load models
lung_disease_model = keras_load_model("/code/app/lung_disease_model.h5")
heart_disease_model = joblib.load("/code/app/disease_prediction_model.pkl")

# Feature ordering
FEATURE_ORDER = [
    "age","sex","cp","trestbps","chol","fbs",
    "restecg","thalach","exang","oldpeak",
    "slope","ca","thal"
]


# ------------------ FASTAPI ------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ STRICT X-RAY VALIDATION (NO CV2) ------------------
def is_valid_xray(img: Image.Image) -> bool:
    """
    Very strict rule-based validation to reject non-X-ray images
    Uses only PIL + NumPy (NO cv2 needed)
    """
    try:
        rgb = img.convert("RGB")
        arr = np.array(rgb)
        gray = np.array(img.convert("L"))

        # 1) X-ray ≈ grayscale → R,G,B must be similar
        r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        diff = (
            np.mean(np.abs(r - g)) +
            np.mean(np.abs(g - b)) +
            np.mean(np.abs(r - b))
        )
        if diff > 25:
            return False

        # 2) Must have decent contrast
        contrast = np.std(gray)
        if contrast < 20:
            return False

        # 3) Histogram spread — X-ray not flat
        hist, _ = np.histogram(gray, bins=32, range=(0,255))
        if np.std(hist) < 80:
            return False

        # 4) Central area must be brighter than outer (lungs)
        h, w = gray.shape
        center = gray[h//4:3*h//4, w//4:3*w//4]
        outer = gray.copy()
        outer[h//4:3*h//4, w//4:3*w//4] = 0
        if np.mean(center) <= np.mean(outer[outer > 0]):
            return False

        return True
    except:
        return False



# ------------------ IMAGE PREPROCESS ------------------
def preprocess_image(img: Image.Image) -> np.ndarray:
    img = img.convert('RGB')
    img = img.resize((150, 150))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


# ------------------ HEART PREDICTION ------------------
def predict_heart_disease(data: dict) -> str:
    try:
        df = pd.DataFrame([data])
        df = df[FEATURE_ORDER]
        df = df.apply(pd.to_numeric)
        prediction = heart_disease_model.predict(df)
        return 'Positive' if prediction[0] == 1 else 'Negative'
    except Exception as e:
        return f"Error: {str(e)}"


# ------------------ MAIN HANDLER ------------------
async def process_message_and_image(message: str, file: Optional[UploadFile]) -> dict:
    model = genai.GenerativeModel("gemini-2.5-flash")

    # ✅ IMAGE submission
    if file:
        try:
            if file.content_type not in ["image/jpeg", "image/png"]:
                return {"error": "Please upload JPEG/PNG image only."}

            file_bytes = await file.read()
            img = Image.open(BytesIO(file_bytes))

            # ✅ STRICT VALIDATION
            if not is_valid_xray(img):
                return {"error": "Enter valid X-ray image."}

            img_array = preprocess_image(img)
            predictions = lung_disease_model.predict(img_array)

            confidence = float(np.max(predictions))
            predicted_class = int(np.argmax(predictions, axis=1)[0])

            labels = ['Covid-19', 'Normal', 'Viral Pneumonia', 'Bacterial Pneumonia']

            # ✅ Confidence threshold
            THRESHOLD = 0.70
            if confidence < THRESHOLD:
                return {"error": "Enter valid X-ray image."}

            predicted_label = labels[predicted_class]

            prompt = (
                f"You are a medical assistant AI. A chest X-ray has been analyzed by a CNN model "
                f"and the predicted result is **{predicted_label}**.\n\n"
                f"Explain meaning, symptoms & why consulting doctor is essential in simple words (3 sentences max)."
            )

            gemini_response = model.generate_content(prompt)

            return {
                "message": gemini_response.text.strip(),
                "prediction": predicted_label,
                "confidence": confidence
            }

        except Exception as e:
            return {"error": f"Error processing image: {str(e)}"}



    # ✅ HEART prediction / text logic
    if message:
        try:
            prompt_intro = (
                "Forget previous chats. You are an AI doctor assistant helping patients understand symptoms. "
                "Keep responses short & correct."
            )

            field_check = model.generate_content(
                f"{message}\n\nDoes the above message contain all fields "
                "['age','sex','cp','trestbps','chol','fbs','restecg','thalach','exang','oldpeak','slope','ca','thal']? "
                "Reply only yes or no."
            )

            if field_check.text.strip().lower() == "yes":
                response = model.generate_content(
                    f"{message}\n\nExtract exactly this JSON: "
                    "{{'age':int,'sex':int,'cp':int,'trestbps':int,'chol':int,'fbs':int,"
                    "'restecg':int,'thalach':int,'exang':int,'oldpeak':float,'slope':int,'ca':int,'thal':int}}"
                )

                try:
                    data_str = response.text.strip().replace("'", '"')
                    data = json.loads(data_str)
                    df = pd.DataFrame([data])
                    df = df[FEATURE_ORDER].apply(pd.to_numeric)
                    prediction = heart_disease_model.predict(df)[0]

                    if prediction == 1:
                        msg = "The model predicts **possible heart disease risk**. Please consult a doctor immediately."
                    else:
                        msg = "The model predicts **no major signs of heart disease**, but regular checkup is advised."

                    return {"message": msg}

                except:
                    return {"message": "Could not extract data. Please enter health parameters clearly."}

            body_part = model.generate_content(
                f"{prompt_intro}\n\nSymptoms: {message}\n\n"
                "Which organ is affected: heart, lungs, brain, or neither? Reply one word."
            ).text.lower()

            if "lungs" in body_part:
                return {"message": "Symptoms point to lungs. Please upload chest X-ray."}

            elif "heart" in body_part:
                ask = model.generate_content(
                    f"{prompt_intro}\n\nSymptoms: {message}\n\n"
                    "Ask user for age, sex, chest pain type, BP, cholesterol & FBS."
                )
                return {"message": ask.text.strip()}

            elif "neither" in body_part:
                reply = model.generate_content(
                    f"{prompt_intro}\n\nSymptoms: {message}\n\n"
                    "Give very short helpful guidance."
                )
                return {"message": reply.text.strip()}

            return {"message": f"Symptoms may relate to {body_part}. Consult doctor."}

        except Exception as e:
            return {"error": f"Error processing message: {str(e)}"}

    return {"message": "Please upload X-ray or describe symptoms."}


# ------------------ ROUTES ------------------
@app.get("/")
def read_root():
    return {"status": "Backend running successfully"}

@app.post("/predict")
async def predict(message: str = Form(...), file: UploadFile = File(None)):
    return await process_message_and_image(message, file)
