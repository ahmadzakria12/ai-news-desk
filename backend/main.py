"""
AI News Backend - FastAPI application with OpenAI Agents SDK
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List, Tuple
from datetime import datetime, timezone
import os
import asyncio
from dotenv import load_dotenv

from utils.helpers import (
    generate_pdf_report,
    generate_voice_summary,
    generate_trend_graph,
    safe_asset_path,
    cleanup_old_generated_files,
)
from utils.guardrails import check_input, check_output
from utils.session_store import InMemorySessionStore
from utils.bilingual_tts import translate_english_to_urdu_for_tts

from agents import (
    SEOAgent,
    YouTubeAgent,
    ForbesAgent,
    WebSearchAgent,
    DailyNewsCollectorAgent,
    BreakingNewsAlertAgent,
    NewsResearchAgent,
    NewsSummarizerAgent,
    MultiAgentNewsroomSystem,
    UltimateAINewsAgent,
    LiveNewsAgent,
    AgentRunner
)

# Try to load environment variables (ignore errors if .env file has issues)
try:
    # Try to load from current directory
    load_dotenv('.env')
    # Also try default location
    load_dotenv()
except Exception:
    pass  # Environment variables may already be set


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks (SRS: optional cleanup of generated assets)."""
    try:
        cleanup_old_generated_files(max_age_hours=24)
    except Exception:
        pass
    yield


def _cors_normalize_origin(url: str) -> str:
    """Browser Origin header has no path; strip whitespace and trailing slashes."""
    return (url or "").strip().rstrip("/")


frontend_url = _cors_normalize_origin(os.getenv("FRONTEND_URL", "http://localhost:3000"))
# Railway never sets VERCEL; without this, "production-only" branches below misbehave.
is_production = (
    os.getenv("ENVIRONMENT") == "production"
    or os.getenv("VERCEL") == "1"
    or os.getenv("RAILWAY_ENVIRONMENT") == "production"
    or os.getenv("RAILWAY_ENVIRONMENT") == "preview"
)

# CORS: default production = registered origins only (SRS). Set CORS_ALLOW_ALL=1 to allow "*".
_extra_origins = [
    _cors_normalize_origin(o)
    for o in os.getenv("CORS_EXTRA_ORIGINS", "").split(",")
    if o.strip()
]
allowed_origins = list(
    dict.fromkeys(
        [
            frontend_url,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            *_extra_origins,
        ]
    )
)
_cors_allow_all = os.getenv("CORS_ALLOW_ALL", "").strip() == "1"

# Vercel preview deploys use https://<project>-<hash>.vercel.app (not only production URL).
_vercel_regex_env = os.getenv("CORS_VERCEL_REGEX", "").strip()
if _vercel_regex_env.lower() in ("0", "false", "no", "off"):
    _cors_vercel_regex: Optional[str] = None
elif _vercel_regex_env:
    _cors_vercel_regex = _vercel_regex_env
elif "vercel.app" in frontend_url:
    _cors_vercel_regex = r"https://.*\.vercel\.app"
else:
    _cors_vercel_regex = None

app = FastAPI(
    title="AI News API",
    description="AI News Backend with OpenAI Agents SDK",
    version="1.0.0",
    lifespan=lifespan,
)

_cors_common = dict(
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

if is_production and not _cors_allow_all:
    _cors_kw = {**_cors_common, "allow_origins": allowed_origins, "allow_credentials": True}
    if _cors_vercel_regex:
        _cors_kw["allow_origin_regex"] = _cors_vercel_regex
    app.add_middleware(CORSMiddleware, **_cors_kw)
elif is_production and _cors_allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        **_cors_common,
    )
else:
    _cors_kw = {**_cors_common, "allow_origins": allowed_origins, "allow_credentials": True}
    if _cors_vercel_regex:
        _cors_kw["allow_origin_regex"] = _cors_vercel_regex
    app.add_middleware(CORSMiddleware, **_cors_kw)

# Request/Response models
class AgentRequest(BaseModel):
    query: str
    agent_type: str  # "seo", "youtube", "forbes", "web_search"
    session_id: Optional[str] = None

class AgentResponse(BaseModel):
    result: str
    session_id: str
    agent_type: str

class NewsRequest(BaseModel):
    query: str
    agents: Optional[List[str]] = None  # List of agents to use
    session_id: Optional[str] = None

class NewsResponse(BaseModel):
    results: dict
    session_id: str

class DailyNewsRequest(BaseModel):
    topics: Optional[List[str]] = None  # ["ai", "crypto", "politics", "health", "pakistan", "sports"]
    session_id: Optional[str] = None

class BreakingNewsRequest(BaseModel):
    query: Optional[str] = None
    session_id: Optional[str] = None

class ResearchRequest(BaseModel):
    topic: str  # e.g., "Pakistan economic crisis summary"
    session_id: Optional[str] = None

class SummarizeRequest(BaseModel):
    content: str
    summary_type: Optional[str] = "medium"  # "ultra-short", "short", "medium"
    session_id: Optional[str] = None

class NewsroomRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class UltimateNewsRequest(BaseModel):
    query: str
    features: Optional[List[str]] = None  # ["daily_collection", "summaries", "trends", "bilingual"]
    language: Optional[str] = "english"  # "english", "urdu", "bilingual"
    session_id: Optional[str] = None

class LiveNewsRequest(BaseModel):
    categories: Optional[List[str]] = None  # ["ai", "crypto", "politics", "health", "pakistan", "sports", "world"]
    session_id: Optional[str] = None


def normalize_agent_key(name: str) -> str:
    """Map SRS-style aliases to internal agent keys."""
    n = (name or "").strip().lower()
    return {
        "research": "news_research",
        "breaking": "breaking_news_alert",
        "breaking_news": "breaking_news_alert",
    }.get(n, n)


def build_live_news_user_prompt(
    categories: Optional[List[str]],
) -> Tuple[str, List[str]]:
    """Build user query + resolved category ids for live news (SRS category filters)."""
    labels = {
        "ai": "AI / machine learning / model releases / AI regulation",
        "ai_tech": "AI & technology (AI/Tech)",
        "tech": "Technology",
        "crypto": "Cryptocurrency & blockchain",
        "politics": "Politics & policy",
        "health": "Health & medicine",
        "pakistan": "Pakistan news",
        "sports": "Sports",
        "world": "International / world news",
        "all": "Balanced headlines across major categories",
    }
    raw = [str(c).strip().lower() for c in (categories or []) if str(c).strip()]
    if not raw or "all" in raw:
        return (
            "Topic scope: ALL / mixed categories. Provide a credible live-desk update across major beats "
            "(include AI/Tech prominently when relevant). Follow the Live News Agent output format.",
            ["all"],
        )
    resolved: List[str] = []
    parts: List[str] = []
    for c in raw:
        key = c.replace(" ", "_").replace("/", "_")
        if key == "ai-tech":
            key = "ai_tech"
        lbl = labels.get(key)
        if lbl:
            resolved.append(key)
            parts.append(lbl)
    if not parts:
        return (
            "Topic scope: AI / technology. Follow the Live News Agent output format.",
            ["ai"],
        )
    text = (
        "Topic scope for this request: "
        + "; ".join(parts)
        + ". Follow the Live News Agent output format with timestamps and source names."
    )
    return text, resolved


def http_exc_from_agent_error(exc: Exception) -> HTTPException:
    msg = str(exc)
    low = msg.lower()
    if "quota" in low or "429" in msg:
        return HTTPException(status_code=402, detail=msg)
    if "invalid" in low and "api" in low:
        return HTTPException(status_code=401, detail=msg)
    if "rate limit" in low:
        return HTTPException(status_code=429, detail=msg)
    if any(
        x in low
        for x in (
            "timeout",
            "connection",
            "name resolution",
            "unreachable",
            "connecterror",
            "temporarily unavailable",
        )
    ):
        return HTTPException(
            status_code=503,
            detail="Upstream AI service unavailable. Please try again later.",
        )
    return HTTPException(status_code=500, detail=msg)


def _freshness_prefix(scope: str = "news") -> str:
    """Explicitly bias agents to current items and away from stale archives."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if scope == "breaking":
        window = "last 24 hours"
    elif scope == "research":
        window = "last 7 days unless the user explicitly asks for historical context"
    else:
        window = "last 24-72 hours"
    return (
        f"Current time: {now}. Prioritize verified AI updates from {window}. "
        "Avoid stale items (for example 2023) unless explicitly requested."
    )


def _fresh_query(query: str, scope: str = "news") -> str:
    base = (query or "").strip()
    prefix = _freshness_prefix(scope)
    return f"{prefix}\n\nUser request: {base}" if base else prefix


# Initialize all agents
seo_agent = SEOAgent()
youtube_agent = YouTubeAgent()
forbes_agent = ForbesAgent()
web_search_agent = WebSearchAgent()
daily_news_collector = DailyNewsCollectorAgent()
breaking_news_alert = BreakingNewsAlertAgent()
news_research = NewsResearchAgent()
news_summarizer = NewsSummarizerAgent()
multi_agent_newsroom = MultiAgentNewsroomSystem()
ultimate_ai_news = UltimateAINewsAgent()
live_news_agent = LiveNewsAgent()
session_store = InMemorySessionStore()
agent_runner = AgentRunner(session_store)

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle OPTIONS requests for CORS preflight"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.get("/")
async def root():
    return {"message": "AI News API", "version": "1.0.0"}

@app.get("/health")
async def health():
    """RSS + optional NewsAPI; no OpenAI. Use this to confirm the running server is current."""
    return {"status": "healthy", "live_news": "rss"}

@app.post("/api/agent", response_model=AgentResponse)
async def run_agent(request: AgentRequest):
    """Run a specific agent"""
    try:
        ok, reason = check_input(request.query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)

        agent_key = normalize_agent_key(request.agent_type)
        agent_map = {
            "seo": seo_agent,
            "youtube": youtube_agent,
            "forbes": forbes_agent,
            "web_search": web_search_agent,
            "daily_news_collector": daily_news_collector,
            "breaking_news_alert": breaking_news_alert,
            "news_research": news_research,
            "news_summarizer": news_summarizer,
            "multi_agent_newsroom": multi_agent_newsroom,
            "ultimate_ai_news": ultimate_ai_news,
            "live_news": live_news_agent,
        }

        if agent_key not in agent_map:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid agent type. Must be one of: {sorted(agent_map.keys())}",
            )

        agent = agent_map[agent_key]
        scoped_query = _fresh_query(
            request.query,
            scope="research" if agent_key == "news_research" else "news",
        )
        result = await agent_runner.run_async(
            agent=agent,
            query=scoped_query,
            session_id=request.session_id,
            use_memory=True,
        )

        out = result.final_output or ""
        out_ok, out_reason = check_output(out)
        if not out_ok:
            raise HTTPException(status_code=400, detail=out_reason)

        return AgentResponse(
            result=out,
            session_id=result.session_id,
            agent_type=request.agent_type,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(f"Error in run_agent: {traceback.format_exc()}")
        raise http_exc_from_agent_error(e)

@app.post("/api/news", response_model=NewsResponse)
async def get_news(request: NewsRequest):
    """Get news from multiple agents"""
    try:
        ok, reason = check_input(request.query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)

        agents_to_use = request.agents or ["seo", "youtube", "forbes", "web_search"]
        results = {}

        agent_map = {
            "seo": seo_agent,
            "youtube": youtube_agent,
            "forbes": forbes_agent,
            "web_search": web_search_agent,
            "daily_news_collector": daily_news_collector,
            "breaking_news_alert": breaking_news_alert,
            "news_research": news_research,
            "news_summarizer": news_summarizer,
            "multi_agent_newsroom": multi_agent_newsroom,
            "ultimate_ai_news": ultimate_ai_news,
            "live_news": live_news_agent,
        }

        session_id = request.session_id or agent_runner.create_session_id()

        async def run_one(agent_label: str, agent_key: str):
            agent = agent_map[agent_key]
            result = await agent_runner.run_async(
                agent=agent,
                query=_fresh_query(request.query, scope="news"),
                session_id=session_id,
                use_memory=False,
            )
            out = result.final_output or ""
            out_ok, out_reason = check_output(out)
            return agent_label, (out if out_ok else f"[Blocked] {out_reason}")

        tasks = []
        for agent_name in agents_to_use:
            key = normalize_agent_key(agent_name)
            if key not in agent_map:
                continue
            tasks.append(run_one(agent_name, key))

        pairs = await asyncio.gather(*tasks)
        results = {label: text for label, text in pairs}

        return NewsResponse(results=results, session_id=session_id)
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/daily-news")
async def get_daily_news(request: DailyNewsRequest):
    """Get daily news collection on specified topics"""
    try:
        topics = request.topics or ["ai", "crypto", "politics", "health", "pakistan", "sports"]
        query = _fresh_query(
            f"Collect today's news on these topics: {', '.join(topics)}",
            scope="news",
        )
        ok, reason = check_input(query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        
        result = await agent_runner.run_async(
            agent=daily_news_collector,
            query=query,
            session_id=request.session_id,
            use_memory=False,
        )
        
        return {
            "result": result.final_output,
            "session_id": result.session_id,
            "topics": topics
        }
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/breaking-news")
async def get_breaking_news(request: BreakingNewsRequest):
    """Get breaking news alerts"""
    try:
        query = _fresh_query(
            request.query or "Check for breaking news and high-impact events",
            scope="breaking",
        )
        ok, reason = check_input(query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        
        result = await agent_runner.run_async(
            agent=breaking_news_alert,
            query=query,
            session_id=request.session_id,
            use_memory=False,
        )
        
        return {
            "result": result.final_output,
            "session_id": result.session_id,
            "alert_type": "breaking_news"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/research")
async def research_topic(request: ResearchRequest):
    """Deep research on a specific topic"""
    try:
        ok, reason = check_input(request.topic)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        result = await agent_runner.run_async(
            agent=news_research,
            query=_fresh_query(
                f"Research this topic in detail: {request.topic}",
                scope="research",
            ),
            session_id=request.session_id,
            use_memory=False,
        )
        
        return {
            "result": result.final_output,
            "session_id": result.session_id,
            "topic": request.topic
        }
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/summarize")
async def summarize_news(request: SummarizeRequest):
    """Create TLDR summaries of news content"""
    try:
        ok, reason = check_input(request.content)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        query = f"Create a {request.summary_type} summary of this content:\n\n{request.content}"
        
        result = await agent_runner.run_async(
            agent=news_summarizer,
            query=query,
            session_id=request.session_id,
            use_memory=False,
        )
        
        return {
            "result": result.final_output,
            "session_id": result.session_id,
            "summary_type": request.summary_type
        }
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/newsroom")
async def newsroom_system(request: NewsroomRequest):
    """Multi-agent newsroom system"""
    try:
        ok, reason = check_input(request.query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        result = await agent_runner.run_async(
            agent=multi_agent_newsroom,
            query=_fresh_query(request.query, scope="news"),
            session_id=request.session_id,
            use_memory=False,
        )
        
        return {
            "result": result.final_output,
            "session_id": result.session_id,
            "system": "multi_agent_newsroom"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.post("/api/ultimate-news")
async def ultimate_news_agent(request: UltimateNewsRequest):
    """Ultimate AI News Agent - All-in-One"""
    try:
        ok, reason = check_input(request.query)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        features = request.features or ["daily_collection", "summaries", "trends"]
        lang = (request.language or "english").strip().lower()
        # REQ-SF5-4: written digest stays English unless user asks for Urdu; bilingual = English text + Urdu audio later
        if lang == "urdu":
            language_note = (
                " Write the entire news digest in Urdu (Nastaliq-friendly plain text, no mixed English except proper nouns where needed)."
            )
        elif lang == "bilingual":
            language_note = (
                " Write the entire news digest in English only. Do not include Urdu script in the written output. "
                "(Bilingual delivery: Urdu will be provided separately as audio for Urdu-speaking users.)"
            )
        else:
            language_note = " Write the entire news digest in English only."

        query = _fresh_query(
            f"{request.query}\n\nUse features: {', '.join(features)}{language_note}",
            scope="news",
        )
        
        result = await agent_runner.run_async(
            agent=ultimate_ai_news,
            query=query,
            session_id=request.session_id,
            use_memory=False,
        )

        out_text = result.final_output or ""
        out_ok, out_reason = check_output(out_text)
        if not out_ok:
            raise HTTPException(status_code=400, detail=out_reason)

        response_data = {
            "result": out_text,
            "session_id": result.session_id,
            "features": features,
            "language": request.language,
        }

        if "pdf_report" in features:
            pdf_path = generate_pdf_report(out_text, title="AI News Report")
            response_data["pdf_path"] = os.path.basename(pdf_path)

        if "voice_summary" in features:
            try:
                if lang == "bilingual":
                    # REQ-SF5-2 / REQ-SF5-3: English digest + Urdu MP3 (ur)
                    urdu_for_tts = await translate_english_to_urdu_for_tts(out_text)
                    voice_path = generate_voice_summary(
                        urdu_for_tts, language="urdu"
                    )
                    response_data["voice_path"] = os.path.basename(voice_path)
                    response_data["voice_audio_language"] = "ur"
                else:
                    voice_path = generate_voice_summary(out_text, language=lang)
                    response_data["voice_path"] = os.path.basename(voice_path)
                    response_data["voice_audio_language"] = (
                        "ur" if lang == "urdu" else "en"
                    )
            except Exception as te:
                response_data["voice_error"] = str(te)

        if "trend_graph" in features:
            trend_data = {
                "dates": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
                "values": [10, 15, 13, 17, 20],
            }
            graph_path = generate_trend_graph(trend_data)
            response_data["graph_path"] = os.path.basename(graph_path)

        return response_data
    except HTTPException:
        raise
    except Exception as e:
        raise http_exc_from_agent_error(e)

@app.get("/api/download-pdf/{filename}")
async def download_pdf(filename: str):
    """Download generated PDF file"""
    try:
        file_path, base = safe_asset_path("reports", filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/pdf", filename=base)
    raise HTTPException(status_code=404, detail="PDF file not found")


@app.get("/api/download-audio/{filename}")
async def download_audio(filename: str):
    """Download generated audio file"""
    try:
        file_path, base = safe_asset_path("audio", filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg", filename=base)
    raise HTTPException(status_code=404, detail="Audio file not found")


@app.get("/api/download-graph/{filename}")
async def download_graph(filename: str):
    """Download generated PNG trend graph"""
    try:
        file_path, base = safe_asset_path("graphs", filename)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="image/png", filename=base)
    raise HTTPException(status_code=404, detail="Graph file not found")

@app.post("/api/live-news")
async def get_live_news(request: LiveNewsRequest):
    """Headlines from NewsAPI.org when ``NEWS_API_KEY`` is set (``urlToImage``); else RSS. Never OpenAI."""
    import asyncio
    import traceback

    from utils.rss_live_news import fetch_live_news_with_meta

    try:
        _, resolved_categories = build_live_news_user_prompt(request.categories)
        items, provider = await asyncio.to_thread(
            fetch_live_news_with_meta,
            resolved_categories,
            10,
            28,
        )
        sid = request.session_id or ""
        return {
            "result": "",
            "items": items,
            "session_id": sid,
            "categories": resolved_categories,
            "update_time": "live",
            "provider": provider,
        }
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = str(e)
        print(f"Error in /api/live-news (RSS): {error_message}\n{error_details}")
        raise HTTPException(
            status_code=503,
            detail="Could not load live news feeds. Check your network connection and try again.",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

