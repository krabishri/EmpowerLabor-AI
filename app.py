"""
Job Mentor Agent - AI-Powered Career Guidance for Informal Workers
Powered by IBM Watsonx.ai with Granite Models
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# ─────────────────────────────────────────────────────────────
#  AGENT_INSTRUCTIONS  — Customize agent behavior here
# ─────────────────────────────────────────────────────────────
AGENT_INSTRUCTIONS = {

    # --- Conversational Tone ---
    "tone": "empathetic, encouraging, simple, and friendly",

    # --- Primary Language ---
    "primary_language": "English",

    # --- Supported Vernacular / Multi-lingual Languages ---
    # Add or remove languages to expand/restrict translation support
    "supported_languages": [
        "English", "Hindi", "Tamil", "Telugu", "Kannada",
        "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi",
        "Odia", "Urdu", "Assamese"
    ],

    # --- Translation Preference ---
    # "auto"  = detect user language and reply in same language
    # "fixed" = always reply in primary_language above
    "translation_mode": "auto",

    # --- Enterprise Safety Rules ---
    "safety_rules": [
        "Never share personal data of users with third parties.",
        "Do not provide legal or financial advice; only general guidance.",
        "Always recommend consulting local government offices for official welfare eligibility.",
        "Avoid political statements or party-specific endorsements.",
        "Do not generate harmful, discriminatory, or offensive content.",
        "Always promote gender-inclusive and accessible job opportunities.",
    ],

    # --- Regional Livelihood Preferences ---
    # Customize the default region to prioritize relevant job sectors
    "default_region": "India",
    "preferred_job_sectors": [
        "Construction", "Agriculture", "Domestic Work", "Street Vending",
        "Auto/Taxi Driving", "Daily Wage Labor", "Gig Economy",
        "Food Delivery", "Handicrafts", "Textile & Garments",
        "Security Guard", "Plumbing & Electrical", "Beauty & Wellness",
    ],

    # --- Welfare Schemes to Highlight ---
    "welfare_schemes": [
        "PM-KISAN", "MGNREGA", "Ayushman Bharat", "PM Awas Yojana",
        "E-Shram Card", "PM SVANidhi", "Skill India Mission",
        "National Apprenticeship Promotion Scheme", "PMJDY",
        "Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)",
    ],

    # --- Upskilling Platforms to Recommend ---
    "upskilling_platforms": [
        "IBM SkillsBuild", "Skill India Portal", "PMKVY (Pradhan Mantri Kaushal Vikas Yojana)",
        "National Skill Development Corporation (NSDC)", "Coursera (free tier)",
        "Google Career Certificates", "DIKSHA Platform", "Swayam NPTEL",
    ],

    # --- Agent Persona ---
    "persona_name": "Sakhi",
    "persona_description": (
        "Sakhi is a compassionate AI job mentor dedicated to empowering informal workers "
        "across India. She speaks simply, avoids jargon, and provides actionable, "
        "localized career guidance in the user's preferred language."
    ),

    # --- Max response length guidance ---
    "max_response_tokens": 800,
    "response_style": "bullet points with short explanations when listing options, conversational for single queries",
}
# ─────────────────────────────────────────────────────────────
#  END AGENT_INSTRUCTIONS
# ─────────────────────────────────────────────────────────────

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fallback_secret_key")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
#  Watsonx.ai Client Initialization
# ─────────────────────────────────────────────────────────────
def get_watsonx_model():
    """Initialize and return the Watsonx.ai model inference client."""
    try:
        api_key = os.getenv("IBM_CLOUD_API_KEY")
        project_id = os.getenv("WATSONX_PROJECT_ID")
        url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

        if not api_key or not project_id:
            raise ValueError("IBM_CLOUD_API_KEY or WATSONX_PROJECT_ID not set in .env")

        credentials = Credentials(
            url=url,
            api_key=api_key
        )

        client = APIClient(credentials)

        model = ModelInference(
            model_id="ibm/granite-13b-instruct-v2",
            api_client=client,
            project_id=project_id,
            params={
                GenParams.MAX_NEW_TOKENS: AGENT_INSTRUCTIONS["max_response_tokens"],
                GenParams.MIN_NEW_TOKENS: 50,
                GenParams.TEMPERATURE: 0.7,
                GenParams.TOP_P: 0.9,
                GenParams.TOP_K: 50,
                GenParams.REPETITION_PENALTY: 1.1,
                GenParams.STOP_SEQUENCES: ["Human:", "User:", "\n\n\n"],
            }
        )
        logger.info("Watsonx.ai model initialized successfully.")
        return model
    except Exception as e:
        logger.error(f"Failed to initialize Watsonx.ai model: {e}")
        return None


# ─────────────────────────────────────────────────────────────
#  Prompt Builder
# ─────────────────────────────────────────────────────────────
def build_system_prompt(language: str = "English") -> str:
    """Construct the system prompt using AGENT_INSTRUCTIONS."""
    safety = "\n".join(f"- {r}" for r in AGENT_INSTRUCTIONS["safety_rules"])
    sectors = ", ".join(AGENT_INSTRUCTIONS["preferred_job_sectors"])
    schemes = ", ".join(AGENT_INSTRUCTIONS["welfare_schemes"])
    platforms = ", ".join(AGENT_INSTRUCTIONS["upskilling_platforms"])
    persona = AGENT_INSTRUCTIONS["persona_name"]
    persona_desc = AGENT_INSTRUCTIONS["persona_description"]
    tone = AGENT_INSTRUCTIONS["tone"]

    return f"""You are {persona}, an AI-powered Job Mentor Agent.
{persona_desc}

TONE: Be {tone}.
LANGUAGE: Respond in {language}. If the user writes in a regional Indian language, respond in that same language.

YOUR SPECIALIZATIONS:
1. JOB MATCHING: Suggest daily-wage, gig, and informal sector jobs from sectors like: {sectors}
2. GOVERNMENT WELFARE: Explain eligibility and benefits of schemes like: {schemes}
3. UPSKILLING: Recommend free courses on platforms like: {platforms} that map to the user's current skills.
4. CAREER GUIDANCE: Provide step-by-step, actionable career paths for informal workers.
5. INCOME PLANNING: Help users understand daily/weekly/monthly income potential for specific jobs.

SAFETY RULES (strictly follow):
{safety}

RESPONSE STYLE:
- Use simple, everyday language. Avoid complex jargon.
- Use bullet points (•) for lists.
- Keep answers concise but complete.
- Always end with an encouraging note or next action step.
- For welfare schemes, always state: "Visit your nearest Common Service Centre (CSC) or government office for official verification."
- If asked about a topic outside your scope, politely redirect to job mentorship topics.

CONTEXT: You are helping informal workers in {AGENT_INSTRUCTIONS['default_region']} find better livelihoods, access government support, and upskill for a better future.
"""


def build_full_prompt(conversation_history: list, user_message: str, language: str = "English") -> str:
    """Build the complete prompt with conversation history."""
    system_prompt = build_system_prompt(language)

    history_text = ""
    for msg in conversation_history[-6:]:  # Last 6 turns for context
        role = "Human" if msg["role"] == "user" else "Sakhi"
        history_text += f"\n{role}: {msg['content']}"

    prompt = f"""{system_prompt}

CONVERSATION HISTORY:{history_text}