from app.services.rag_service import generate_rag_answer


queries = [
    "MRP declaration requirement",
    "retail sale price declaration",
    "maximum retail price declaration",
]

print("\n")
print("=" * 70)
print("RAG TEST")
print("=" * 70)

print("\nQuestion:")
print(query)

print("\nGenerating answer...\n")

result = generate_rag_answer(
    query=query,
    top_k=5
)

print("=" * 70)
print("ANSWER")
print("=" * 70)

print(result["answer"])

print("\n")
print("=" * 70)
print("RULES USED")
print("=" * 70)

for rule in result.get("rules_used", []):
    print(
        f"\n{rule['clause_reference']}: "
        f"{rule['reason']}"
    )

print("\n")
print("=" * 70)
print("RETRIEVED RULES")
print("=" * 70)

for rule in result.get("retrieved_rules", []):
    print(
        f"{rule['clause_reference']} "
        f"(similarity={rule['similarity']:.4f})"
    )
