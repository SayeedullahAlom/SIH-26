import os
import json

from dotenv import load_dotenv
from google import genai

from app.services.retrieval_service import retrieve_relevant_rules


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

AI_API_KEY = os.getenv("AI_API_KEY")

if not AI_API_KEY:
    raise RuntimeError("AI_API_KEY is not set")

client = genai.Client(api_key=AI_API_KEY)

# Minimum similarity required for a rule to be considered
# sufficiently relevant.
SIMILARITY_THRESHOLD = 0.70


# ============================================================
# BUILD LEGAL CONTEXT
# ============================================================

def build_context(rules: list[dict]) -> str:
    """
    Convert retrieved legal rules into a context string
    that can be supplied to Gemini.
    """

    context_parts = []

    for i, rule in enumerate(rules, start=1):
        context_parts.append(
            f"""
RULE {i}
Clause Reference: {rule['clause_reference']}
Chapter: {rule['chapter']}
Title: {rule['title']}
Similarity: {rule['similarity']:.4f}

Legal Text:
{rule['text']}
""".strip()
        )

    return "\n\n".join(context_parts)


# ============================================================
# FILTER RELEVANT RULES
# ============================================================

def filter_relevant_rules(rules: list[dict]) -> list[dict]:
    """
    Keep only rules whose similarity score is above
    the configured threshold.
    """

    return [
        rule
        for rule in rules
        if rule["similarity"] >= SIMILARITY_THRESHOLD
    ]


# ============================================================
# GENERATE RAG ANSWER
# ============================================================

def generate_rag_answer(
    query: str,
    top_k: int = 5
) -> dict:
    """
    Retrieve relevant legal rules and generate a grounded
    answer using Gemini.

    The model is instructed to use ONLY the retrieved
    legal rules.
    """

    # --------------------------------------------------------
    # 1. RETRIEVE RELEVANT RULES
    # --------------------------------------------------------

    rules = retrieve_relevant_rules(
        query=query,
        top_k=top_k
    )

    if not rules:
        return {
            "answer": (
                "No relevant legal rules were found for this question."
            ),
            "rules_used": [],
            "retrieved_rules": [],
            "status": "REVIEW_REQUIRED"
        }

    # --------------------------------------------------------
    # 2. FILTER LOW-SIMILARITY RESULTS
    # --------------------------------------------------------

    relevant_rules = filter_relevant_rules(rules)

    if not relevant_rules:
        return {
            "answer": (
                "The available legal rules do not provide "
                "sufficient evidence to answer this question."
            ),
            "rules_used": [],
            "retrieved_rules": rules,
            "status": "REVIEW_REQUIRED"
        }

    # --------------------------------------------------------
    # 3. BUILD LEGAL CONTEXT
    # --------------------------------------------------------

    context = build_context(relevant_rules)

    # --------------------------------------------------------
    # 4. CREATE STRICT RAG PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are a Legal Metrology compliance assistant.

You MUST answer the user's question using ONLY the
legal rules provided in the LEGAL RULE CONTEXT.

IMPORTANT RULES:

- Do NOT use outside legal knowledge.
- Do NOT invent legal requirements.
- Do NOT invent Rule numbers or Clause references.
- Do NOT assume information that is not present in the
  supplied legal text.
- Every legal conclusion must be supported by one or more
  supplied rules.
- If the supplied rules are insufficient, explicitly state
  that the information is insufficient.
- If the question cannot be answered reliably from the
  supplied rules, the status must be REVIEW_REQUIRED.
- Preserve the meaning of the supplied legal text.
- Do not claim that a requirement exists unless the
  supplied legal text supports it.

LEGAL RULE CONTEXT
==================

{context}

USER QUESTION
=============

{query}

RESPONSE REQUIREMENTS
=====================

Provide:

1. A concise answer to the user's question.
2. Clear reasoning based on the supplied rules.
3. The exact Rule/Clause references supporting the answer.
4. A list of the rules actually used.

Return ONLY valid JSON in this exact structure:

{{
    "answer": "Your answer based only on the supplied rules.",
    "status": "ANSWERED",
    "rules_used": [
        {{
            "clause_reference": "Rule ...",
            "reason": "Why this rule supports the answer."
        }}
    ]
}}

The status must be one of:

"ANSWERED"
"REVIEW_REQUIRED"
"""


    # --------------------------------------------------------
    # 5. GEMINI GENERATION
    # --------------------------------------------------------

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    # --------------------------------------------------------
    # 6. PARSE GEMINI RESPONSE
    # --------------------------------------------------------

    try:
        result = json.loads(response.text)

    except (json.JSONDecodeError, TypeError):
        result = {
            "answer": response.text,
            "status": "REVIEW_REQUIRED",
            "rules_used": []
        }

    # --------------------------------------------------------
    # 7. VALIDATE RESPONSE STRUCTURE
    # --------------------------------------------------------

    if "answer" not in result:
        result["answer"] = (
            "Unable to generate a reliable answer from "
            "the retrieved legal rules."
        )

    if "rules_used" not in result:
        result["rules_used"] = []

    if "status" not in result:
        result["status"] = "REVIEW_REQUIRED"

    # --------------------------------------------------------
    # 8. ADD RETRIEVAL INFORMATION
    # --------------------------------------------------------

    result["retrieved_rules"] = rules

    return result