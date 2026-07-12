# Job Mentor Agent 🤖💼

> **AI-Powered Career Guide for India's Informal Workers**  
> Built with Python Flask + IBM Watsonx.ai (Granite Models)

---

## What This Does

The Job Mentor Agent is a full-stack web application that provides personalized career mentorship for daily-wage workers, gig workers, and informal sector employees in India. It uses IBM Watsonx.ai with Granite language models to deliver:

| Feature | Description |
|---|---|
| 🤖 **Mentor Chat** | Warm, multilingual career guidance in 11 Indian languages |
| 💼 **Job Matching** | Localized daily-wage & gig job suggestions with full parameters (₹ wage, skills, demand, seasonality) |
| 🎓 **Upskilling Roadmap** | Personalized learning paths mapped to IBM SkillsBuild, PMKVY, NSDC courses |
| 🛡️ **Welfare Checker** | Plain-language government scheme eligibility (PM-KISAN, MGNREGS, Ayushman Bharat, SVANidhi, etc.) |
| 🎙️ **Voice Profile** | Speak in your mother tongue — mic input in 11 Indian languages |
| ♿ **Accessibility** | High-contrast mode, large-text mode, ARIA labels, screen reader support |

---

## Project Structure

```
job_mentor_agent/
├── app.py                  ← Flask backend + AGENT_INSTRUCTIONS
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── .gitignore
├── templates/
│   ├── index.html          ← Chat interface
│   └── dashboard.html      ← Job match / upskill / welfare dashboard
└── static/
    ├── css/
    │   └── style.css       ← Full responsive stylesheet
    └── js/
        ├── app.js          ← Chat page logic + voice input
        └── dashboard.js    ← Dashboard logic + voice profile
```

---

## Prerequisites

- **Python 3.9+** (check: `python --version`)
- **IBM Cloud account** with Watsonx.ai service enabled
- **IBM Watsonx.ai project** created
- Internet connection (calls IBM API)

---

## Step-by-Step Local Deployment

### Step 1 — Clone / Download the Project

```bash
# If you have git:
git clone <your-repo-url> job_mentor_agent
cd job_mentor_agent

# Or just navigate to the project folder:
cd path/to/job_mentor_agent
```

### Step 2 — Create a Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it:
# On Windows:
venv\Scripts\activate

# On macOS / Linux:
source venv/bin/activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

This installs Flask, Flask-Session, python-dotenv, and the IBM Watsonx.ai SDK.

### Step 4 — Get Your IBM Cloud Credentials

**4a. IBM Cloud API Key:**
1. Go to [https://cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys)
2. Click **"Create an IBM Cloud API key"**
3. Give it a name (e.g., `job-mentor-agent`)
4. Copy the API key — **you won't see it again!**

**4b. Watsonx.ai Project ID:**
1. Go to [https://dataplatform.cloud.ibm.com/](https://dataplatform.cloud.ibm.com/)
2. Create a new project or open an existing one
3. Go to **Manage** → **General** tab
4. Copy the **Project ID**

**4c. Choose your Regional URL** (use the region where your Watsonx instance is):
- US South (Dallas): `https://us-south.ml.cloud.ibm.com`
- EU Germany:        `https://eu-de.ml.cloud.ibm.com`
- EU UK:             `https://eu-gb.ml.cloud.ibm.com`
- Japan (Tokyo):     `https://jp-tok.ml.cloud.ibm.com`
- Australia (Sydney):`https://au-syd.ml.cloud.ibm.com`

### Step 5 — Configure the .env File

```bash
# Copy the example file
cp .env.example .env
```

Open `.env` in any text editor and fill in your values:

```env
WATSONX_API_KEY=your_actual_api_key_here
WATSONX_PROJECT_ID=your_actual_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-13b-instruct-v2
FLASK_SECRET_KEY=choose-any-long-random-string
FLASK_DEBUG=false
PORT=5000
```

> ⚠️ **Never commit `.env` to git.** It's already in `.gitignore`.

### Step 6 — Run the Application

```bash
python app.py
```

You should see:
```
INFO:__main__:Starting Job Mentor Agent on port 5000
 * Running on http://0.0.0.0:5000
```

Open your browser at: **http://localhost:5000**

---

## Using the Application

### Chat Interface (`/`)

1. **Fill your profile** in the left panel — name, location, occupation, skills, education, preferred sector
2. **Click "Save Profile"** — this personalizes all AI responses to your situation
3. **Choose a Chat Mode**:
   - 🤖 **Mentor Chat** — General career guidance
   - 💼 **Job Match** — Ask for job opportunities
   - 🎓 **Upskill** — Request a learning roadmap
   - 🛡️ **Welfare** — Check scheme eligibility
4. **Type your question** or click the **blue mic button** to speak
5. Use **Quick Ask** buttons for instant common queries

### Dashboard (`/dashboard`)

- **Job Matching Panel** — Select location and sector, click "Find Jobs"
- **Upskilling Panel** — Choose a goal, click "Get My Roadmap", track progress with checkboxes
- **Welfare Panel** — Filter by category, click "Check My Eligibility"
- **Voice Profile** — Tap the large mic button to speak in any Indian language

### Accessibility Features

| Button | Action |
|---|---|
| ◑ (half-circle) icon | Toggle high-contrast mode |
| H₁ icon | Toggle large-text mode |
| Blue mic button | Start/stop voice input |
| Tab key | Navigate through all controls |

---

## Customizing the Agent

Open `app.py` and find the **`AGENT_INSTRUCTIONS`** section at the top (lines 1–88).

You can customize:

```python
# TONE & PERSONA — change how the agent speaks
# MULTILINGUAL — add/remove supported languages
# DOMAIN FOCUS — change sector priorities or add new sectors
# UPSKILLING — add new course platforms or programs
# GOVERNMENT WELFARE SCHEMES — add new schemes or regions
# ENTERPRISE SAFETY RULES — add/modify content safety rules
```

The `SYSTEM_PROMPT` variable (around line 97) is what's sent to the model. Edit it to instantly change agent behavior without touching any other code.

**To change the Granite model**, update your `.env`:
```env
# Lighter and faster:
GRANITE_MODEL_ID=ibm/granite-3-8b-instruct

# Best for Indian languages:
GRANITE_MODEL_ID=ibm/granite-20b-multilingual
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Chat interface |
| `GET` | `/dashboard` | Dashboard |
| `POST` | `/api/chat` | Send chat message `{"message": "...", "mode": "CHAT"}` |
| `GET/POST` | `/api/profile` | Get or update user profile |
| `POST` | `/api/job-match` | Get job matches `{"query": "...", "location": "...", "sector": "..."}` |
| `POST` | `/api/upskill` | Get upskilling roadmap `{"query": "..."}` |
| `POST` | `/api/welfare` | Check welfare eligibility `{"query": "..."}` |
| `POST` | `/api/clear-history` | Clear chat session |
| `GET` | `/api/health` | Health check |

---

## Supported Languages (Voice + Text)

| Language | Script | Voice Input |
|---|---|---|
| English | Latin | ✅ |
| हिंदी (Hindi) | Devanagari | ✅ |
| தமிழ் (Tamil) | Tamil | ✅ |
| తెలుగు (Telugu) | Telugu | ✅ |
| ಕನ್ನಡ (Kannada) | Kannada | ✅ |
| বাংলা (Bengali) | Bengali | ✅ |
| मराठी (Marathi) | Devanagari | ✅ |
| മലയാളം (Malayalam) | Malayalam | ✅ |
| ਪੰਜਾਬੀ (Punjabi) | Gurmukhi | ✅ |
| ଓଡ଼ିଆ (Odia) | Odia | ✅ |
| اردو (Urdu) | Nastaliq | ✅ |

> Voice input uses the browser's Web Speech API (best support in Chrome and Edge).

---

## Government Welfare Schemes Covered

| Scheme | Benefit |
|---|---|
| **PM-KISAN** | ₹6,000/year for farmers |
| **MGNREGS** | 100 days guaranteed employment |
| **PM Awas Yojana** | Affordable housing assistance |
| **Ayushman Bharat** | Health cover up to ₹5 lakh |
| **PM SVANidhi** | Street vendor micro-loans up to ₹50,000 |
| **Ujjwala Yojana** | Free LPG connection for BPL families |
| **BOCW Welfare** | Construction worker welfare |
| **State schemes** | As applicable per user's location |

---

## Troubleshooting

**"Configuration error: WATSONX_API_KEY not set"**  
→ Make sure `.env` file exists and has valid credentials. Run `cp .env.example .env` and fill values.

**"Service temporarily unavailable"**  
→ Check your IBM Cloud account is active and Watsonx.ai service is provisioned. Verify the WATSONX_URL matches your region.

**Voice input not working**  
→ Use Google Chrome or Microsoft Edge. Allow microphone permission when prompted. HTTPS is required in production.

**Empty or garbled responses**  
→ Try a different Granite model in `.env` (e.g., `ibm/granite-3-8b-instruct`). Check your Watsonx Project ID is correct.

**ModuleNotFoundError**  
→ Make sure virtual environment is activated (`venv\Scripts\activate` on Windows) before running `pip install` and `python app.py`.

---

## Production Deployment (Optional)

For production, use Gunicorn instead of Flask's dev server:

```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

Recommended production settings in `.env`:
```env
FLASK_DEBUG=false
FLASK_SECRET_KEY=<strong-random-64-char-string>
```

---

## Emergency Helplines

The agent is programmed to surface these resources if a user appears distressed:

- **iCall**: 9152987821
- **Vandrevala Foundation**: 1860-2662-345
- **Common Services Centre**: 1800-11-0001

---

## License

MIT License — free to use, modify, and distribute.

---

*Built with IBM Watsonx.ai Granite Models & IBM SkillsBuild*
