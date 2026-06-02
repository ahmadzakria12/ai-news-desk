# AI News Agents Guide

## Available Agents

### 1. Daily News Collector Agent
**Endpoint:** `POST /api/daily-news`

**Purpose:** Monitors and collects daily news on specific topics

**Topics:** AI, Crypto, Politics, Health, Pakistan News, Sports

**Request:**
```json
{
  "topics": ["ai", "crypto", "politics", "health", "pakistan", "sports"],
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "result": "Daily news report...",
  "session_id": "session-id",
  "topics": ["ai", "crypto", ...]
}
```

### 2. Breaking News Alert Agent
**Endpoint:** `POST /api/breaking-news`

**Purpose:** Alerts on breaking and high-impact news

**Request:**
```json
{
  "query": "Check for breaking news",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "result": "🚨 BREAKING NEWS ALERT 🚨...",
  "session_id": "session-id",
  "alert_type": "breaking_news"
}
```

### 3. News Research Agent
**Endpoint:** `POST /api/research`

**Purpose:** Deep research on long topics with multi-source analysis

**Request:**
```json
{
  "topic": "Pakistan economic crisis summary",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "result": "Comprehensive research report...",
  "session_id": "session-id",
  "topic": "Pakistan economic crisis summary"
}
```

### 4. News Summarizer Agent
**Endpoint:** `POST /api/summarize`

**Purpose:** Creates TLDR summaries of news content

**Request:**
```json
{
  "content": "Long news article text...",
  "summary_type": "medium",
  "session_id": "optional-session-id"
}
```

**Summary Types:**
- `ultra-short`: 1 sentence
- `short`: 2-3 sentences
- `medium`: Paragraph summary

### 5. Multi-Agent Newsroom System
**Endpoint:** `POST /api/newsroom`

**Purpose:** Coordinates multiple agents for news processing

**Request:**
```json
{
  "query": "Collect and process today's news",
  "session_id": "optional-session-id"
}
```

### 6. Ultimate AI News Agent
**Endpoint:** `POST /api/ultimate-news`

**Purpose:** All-in-one agent with comprehensive features

**Features:**
- Daily news collection
- Long and short summaries
- Trend analysis
- Bilingual support (English/Urdu)
- PDF report generation
- Voice summary (MP3)
- Trend graphs

**Request:**
```json
{
  "query": "Get today's AI news",
  "features": ["daily_collection", "summaries", "trends", "pdf_report", "voice_summary"],
  "language": "english",
  "session_id": "optional-session-id"
}
```

**Languages:**
- `english`: English only
- `urdu`: Urdu only
- `bilingual`: Both languages

**Response:**
```json
{
  "result": "Comprehensive news report...",
  "session_id": "session-id",
  "features": ["daily_collection", "summaries", ...],
  "language": "english",
  "pdf_path": "reports/news_report_20240101_120000.pdf",
  "voice_path": "audio/voice_summary_20240101_120000.mp3",
  "graph_path": "graphs/trend_graph_20240101_120000.png"
}
```

## File Downloads

### Download PDF
**Endpoint:** `GET /api/download-pdf/{filename}`

### Download Audio
**Endpoint:** `GET /api/download-audio/{filename}`

## Example Usage

### Python
```python
import requests

# Daily News Collection
response = requests.post("http://localhost:8000/api/daily-news", json={
    "topics": ["ai", "pakistan"]
})
print(response.json())

# Breaking News
response = requests.post("http://localhost:8000/api/breaking-news", json={
    "query": "Check for breaking news"
})
print(response.json())

# Research Topic
response = requests.post("http://localhost:8000/api/research", json={
    "topic": "Pakistan economic crisis summary"
})
print(response.json())

# Ultimate Agent with all features
response = requests.post("http://localhost:8000/api/ultimate-news", json={
    "query": "Get comprehensive AI news report",
    "features": ["daily_collection", "summaries", "trends", "pdf_report"],
    "language": "bilingual"
})
result = response.json()
print(result["result"])
# Download PDF if generated
if "pdf_path" in result:
    pdf_response = requests.get(f"http://localhost:8000/api/download-pdf/{result['pdf_path'].split('/')[-1]}")
    with open("report.pdf", "wb") as f:
        f.write(pdf_response.content)
```

### cURL
```bash
# Daily News
curl -X POST http://localhost:8000/api/daily-news \
  -H "Content-Type: application/json" \
  -d '{"topics": ["ai", "crypto"]}'

# Breaking News
curl -X POST http://localhost:8000/api/breaking-news \
  -H "Content-Type: application/json" \
  -d '{"query": "Check breaking news"}'

# Research
curl -X POST http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Current AI trends in 2026"}'

# Ultimate Agent
curl -X POST http://localhost:8000/api/ultimate-news \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Get comprehensive news",
    "features": ["daily_collection", "summaries", "pdf_report"],
    "language": "english"
  }'
```

## Notes

- All agents use OpenAI GPT-4o model
- Sessions are maintained for conversation context
- Guardrails ensure content safety and quality
- PDF, audio, and graph files are saved in respective directories
- Files can be downloaded via dedicated endpoints






