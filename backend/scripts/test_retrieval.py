from app.services.retrieval_service import retrieve_relevant_rules


queries = [
    "MRP declaration requirement",
    "net quantity declaration requirement",
    "manufacturer name and address on package",
    "consumer care details on package",
    "date declaration on packaged commodity",
    "dimensions and weight declaration",
]


for query in queries:

    print("\n")
    print("=" * 80)
    print(f"QUERY: {query}")
    print("=" * 80)

    results = retrieve_relevant_rules(
        query=query,
        top_k=5
    )

    for i, result in enumerate(results, 1):

        print("-" * 80)
        print(f"Result #{i}")
        print(f"Clause      : {result['clause_reference']}")
        print(f"Chapter     : {result['chapter']}")
        print(f"Title       : {result['title']}")
        print(f"Similarity  : {result['similarity']:.4f}")
        print(f"Text        : {result['text']}")