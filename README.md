# 🥗 OmniNutri – AI Nutrition & Lifestyle Tracker

A personalized nutrition tracker with an AI assistant, built for South Asian food culture. Supports meal logging via text or food photo, daily calorie/water/macro tracking, and a 40+ question onboarding wizard.

---

## 🌐 Live Preview
👉 *[OmniNutri – AI Nutrition & Lifestyle Tracker](https://omninutrihealth.netlify.app/)*

---

## 📌 Project Overview

OmniNutri is an MVP-ready full-stack nutrition app designed to give users a personalized health dashboard based on their profile, goals, and daily intake. The focus is on **AI-powered food analysis, South Asian diet support, and a clean, extensible architecture**.

---

## 🛠️ Tech Stack

* React (Vite) + Supabase JS SDK
* FastAPI + Uvicorn
* Supabase (Auth + Postgres)
* Gemini Vision API (food image analysis)
* Groq / local LLM (text meal analysis)
* Optional: ChromaDB + sentence-transformers (RAG)

---

## ✨ Key Features

* Email/password auth with verification (OTP-style link)
* 40+ question onboarding wizard (sliders, matrix, time ranges, multi-choice)
* Personalized dashboard — BMI, TDEE, calorie & water targets
* Manual meal logging + AI food scan (image → nutrition JSON)
* Weekly calorie strip and daily macro breakdown
* Unified `/chat` API endpoint for text and image inputs

---

## 🧠 Development Notes

Key areas of focus during development:

* Multi-agent AI architecture (Watcher / Finder / Brain)
* Supabase RLS policies for secure per-user data access
* JSONB storage for flexible onboarding answers
* Fallback handling for external AI API failures
* Designing for extensibility toward RAG + LangGraph orchestration

---

## 🚀 Getting Started

### Frontend
```bash
cd omninutri-web
npm install
npm run dev
```

Create `omninutri-web/.env`:
```env
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_BACKEND_URL=http://127.0.0.1:8000
```

### Backend
```bash
cd omninutri-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Create `omninutri-backend/.env`:
```env
GEMINI_API_KEY=YOUR_KEY
GROQ_API_KEY=YOUR_KEY
```

> API docs available at `http://127.0.0.1:8000/docs`

---

## 📂 Project Structure

```
omninutri-backend/
├── app/
│   ├── main.py
│   ├── routes/chat.py
│   ├── agents/
│   │   ├── watcher.py       # image → nutrition
│   │   ├── finder.py        # text → nutrition
│   │   └── brain.py         # BMI / TDEE / advice
│   ├── services/rag.py
│   └── models/schemas.py

omninutri-web/
├── src/
│   ├── App.jsx
│   ├── onboardingSteps.js
│   ├── components/OnboardingWizard.jsx
│   └── lib/supabase.js
```

---

## 🔮 Future Improvements

* RAG-powered meal suggestions using ChromaDB
* Full food diary screen (search, edit, history)
* Habit reminders and streak tracking
* LangGraph multi-agent orchestration
* Google Fit / Apple Health integration

---
