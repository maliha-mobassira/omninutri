import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

try:
    response = client.models.list()
    print("SUCCESS")
    print(response)
except Exception as e:
    import traceback
    print("FAILED:", type(e).__name__, str(e))
    traceback.print_exc()


#     cd "C:\Internship Project\omninutri-backend"
# .\venv\Scripts\activate
# python -m uvicorn app.main:app --reload


# cd "C:\Internship Project\omninutri-backend\omninutri-web"
# npm run dev