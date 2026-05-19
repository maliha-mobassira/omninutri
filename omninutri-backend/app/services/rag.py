import chromadb
from chromadb.utils import embedding_functions

# ✅ Lightweight embedding (no torch, no transformers)
embedding_function = embedding_functions.DefaultEmbeddingFunction()

# In-memory Chroma (minimal version)
client = chromadb.Client()

collection = client.get_or_create_collection(
    name="food_knowledge",
    embedding_function=embedding_function
)

def add_document(doc_id: str, text: str, metadata: dict = None):
    """
    Add a document into the RAG collection.
    Chroma requires metadata to NOT be empty.
    """
    safe_metadata = metadata if metadata else {"source": "seed"}

    collection.add(
        ids=[doc_id],
        documents=[text],
        metadatas=[safe_metadata]
    )

def query_rag(query_text: str, top_k: int = 3):
    """
    Query relevant documents from the RAG collection.
    """
    results = collection.query(
        query_texts=[query_text],
        n_results=top_k
    )

    if not results or not results.get("documents"):
        return []

    return results["documents"][0]