"""
LLM Call Module - Interface with Azure OpenAI (Grok-3)

This module provides a clean interface to call the Grok-3 model
with context from hybrid semantic search results.
"""

from openai import OpenAI
from json import loads
import os
from typing import Any
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from RAG directory (parent of services directory)
env_path = Path(__file__).parent.parent / "env"
load_dotenv(env_path)


class GrokClient:
    """
    Client for calling Azure OpenAI Grok-3 model.
    
    Provides methods for generating responses with optional context
    from retrieved documents (RAG pattern).
    """

    def __init__(self):
        """Initialize the Grok client with Azure OpenAI configuration."""
        self.endpoint = os.getenv("AOAI_ENDPOINT")
        self.api_key = os.getenv("AOAI_GROK_API_KEY")
        self.deployment_name = "grok-3"
        
        if not self.endpoint or not self.api_key:
            raise EnvironmentError("AOAI_ENDPOINT and AOAI_GROK_API_KEY must be set in .env")
        
        self.client = OpenAI(
            base_url=self.endpoint,
            api_key=self.api_key
        )

    def call_grok(self, user_query: str, system_context: str, doc_context:str, *, max_token=1000) -> str:
        """
        Call Grok-3 model with system context and document context.
        
        Args:
            user_query (str): The user's question or prompt
            system_context (str): System instructions for model behavior
            doc_context (str): Retrieved context from documents for RAG
        
        Returns:
            str: Model's response
        """

        try:
            completion = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Your name is Clara. You are an educational assistant that is eager to help the user on the subject they gave you."
                        "Your should answer in a warm tone and be nice but no need for any pleasing techniques."
                        "Don't hesitate to use a different choice of words and point of view when answering because the user probably needs a different perspective."
                        "Answer to them in the language they talked to you in."
                    },
                    {
                        "role": "system",
                        "content": system_context
                    },
                    {
                        "role": "user",
                        "content": f"Here is the context to base your reply on :\n---\n{doc_context}\n---"
                    },
                    {
                        "role": "user",
                        "content": user_query,
                    }
                ],
                temperature=0.7,
                max_tokens=max_token,
            )

            return completion.choices[0].message.content
        
        except Exception as e:
            raise RuntimeError(f"Grok API call failed: {str(e)}")
    
    def generateExercises(self, user_query:str, context:str, n_questions:int=5) -> any:
        sys_context = f"""
Tu vas générer {n_questions} questions à choix multiple basées exclusivement sur le contenu qu'on va te donner.

Contraintes de sortie :
- Chaque item doit être structuré en JSON.
- Pas de texte hors JSON.
- Les propositions incorrectes doivent être plausibles mais fausses.
- Le vocabulaire doit rester aligné avec le contenu fourni.
- Format strict des éléments :
{{
"question": str,
"choices": [ str, str, str, str ],
"correct_answer": int,
"explanation": str
}}
- Le tout enveloppé dans une liste
"""
        
        raw_output = self.call_grok(
            user_query=user_query, 
            system_context=sys_context, 
            doc_context=context
        )

        return self._formatJSON(raw_output)
    
    def chatWithGrok(self, user_query:str, context:str) -> str:
        """
        A function to call when needing to answer a single question.
        
        :param user_query: The user's question
        :type user_query: str
        :param context: The needed context extracted from storage
        :type context: str
        :return: Returns the answer in plain text 
        :rtype: str
        """

        system_context = f"No formatting needed, answer in a concise way making it as clear as possible for the user."

        answer = self.call_grok(
            user_query=user_query, 
            system_context=system_context, 
            doc_context=context
        )

        return answer
    
    def generateRevisionSheets(self, user_query:str, context:str) -> Any:
        
        system_context = """
You will be given some content related to a concept either the user struggles to understand or needs help to revise.
You will generate a set of revision sheets based strictly on the said provided content.

Your task happens in two steps:
1. Identify the key concepts that a student must understand from this material. 
The chosen concepts must ideally be building blocks of higher concepts so that the user doesn't miss any necessary concept and struggles to later understand more complex concepts.
You can occasionally choose a higher concept to explain to the condition that you already have written sheets to explain the concepts needed to understand the said higher concept. 
2. For each concept, produce one structured revision sheet. 
You are the one to decide the number of sheets based on the number of concepts you find crucial. That number shall not excede 10.

Output format:
[
    {
        "title": str,
        "key_concepts: [str, str, ...],
        "detailed_explanation": str
    },
    ...
]

Constraints:
- Only use information given to you.
- Do not invent external facts.
- Keep terminology consistent with the text.
- Each revision sheet must be clear, concise, and technically accurate.
- No need for extensive length, keep each sheet brief while not sacrificing clarity.
- No extra text outside the JSON object.
"""

        raw_output = self.call_grok(
            user_query=user_query, 
            system_context=system_context, 
            doc_context=context
        )

        return self._formatJSON(raw_output)

    def _formatJSON(self, raw_results:str) -> Any :
        try:
            formated_results = loads(raw_results)
        except Exception:
            # fallback minimal en cas de légère dérive : extraction JSON
            import re
            json_match = re.search(r"\[.*\]", raw_results, re.DOTALL)
            if json_match:
                formated_results = loads(json_match.group(0))
            else:
                raise RuntimeError("Impossible de parser la sortie du modèle.")
            
        return formated_results
        
