from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import random

app = FastAPI(title="Google-Grade Stock Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Portfolio from User Memory
PORTFOLIO = [
    "SMCI", "FTC", "FRSH", "SOUN", "DVLT", "LAES", "NVO", "SGLN", "IMM", "MQ", 
    "TTD", "SSLN", "PATH", "VERI", "BBAI", "GOOGL", "NTSK", "CPER", "SRUF", "IOT", 
    "CLSK", "DLTM", "EU", "DNN", "LYFT", "JLP", "TGLS", "HOOD", "IREN", "UUUU", "UPST", "WULF"
]

def get_mock_price(ticker):
    base_prices = {"GOOGL": 170.0, "SMCI": 30.0, "NVO": 110.0}
    base = base_prices.get(ticker, random.uniform(10, 500))
    return round(base * (1 + random.uniform(-0.02, 0.02)), 2)

def get_mock_pe(ticker):
    return round(random.uniform(15, 100), 2)

def get_mock_news(ticker):
    news_templates = [
        "Surged on AI partnership news.",
        "Under pressure due to regulatory probe.",
        "Upgraded to 'Buy' by major analysts.",
        "Mixed earnings report, volatility expected.",
        "Expanding operations into Asian markets."
    ]
    return random.choice(news_templates)

@app.get("/api/stocks")
async def get_stocks():
    data = []
    for ticker in PORTFOLIO:
        data.append({
            "ticker": ticker,
            "price": get_mock_price(ticker),
            "pe": get_mock_pe(ticker),
            "summary": get_mock_news(ticker),
            "change": round(random.uniform(-5, 5), 2)
        })
    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
