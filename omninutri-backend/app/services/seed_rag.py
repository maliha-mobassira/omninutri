from app.services.rag import add_document

def seed():
    add_document(
        "dal_recipe",
        "Dal is made from lentils, turmeric, garlic, onion, and cumin. It is high in protein and fiber."
    )

    add_document(
        "biryani_recipe",
        "Chicken biryani contains rice, chicken, spices, oil, yogurt. It is high calorie and protein."
    )

    add_document(
        "budget_meals",
        "Budget meals include dal, rice, eggs, chickpeas, seasonal vegetables."
    )

    add_document(
        "high_protein_foods",
        "High protein foods include eggs, chicken, lentils, chickpeas, paneer."
    )

if __name__ == "__main__":
    seed()
    print("RAG seeded ✅")