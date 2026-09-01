from app.services.embedding_service import get_embedding


text = """
Rule 6(1)(e) requires the retail sale price or MRP
to be declared on the package.
"""

embedding = get_embedding(text)

print("Embedding generated successfully!")
print("Dimensions:", len(embedding))
print("First 5 values:", embedding[:5])