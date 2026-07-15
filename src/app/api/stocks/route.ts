import { NextResponse } from "next/server";
import { LIVE_TOKENIZED_STOCKS } from "@/lib/tokenized-stocks";
import { getMockQuote } from "@/lib/stock-market-mock";

export function GET() {
  const stocks = LIVE_TOKENIZED_STOCKS.map((stock) => {
    const quote = getMockQuote(stock);
    return {
      id: stock.id,
      ticker: stock.ticker,
      name: stock.instrumentName,
      contractAddress: stock.contractAddress,
      sector: stock.sector,
      rarity: stock.rarity,
      price: quote.price,
      changePercent: quote.changePercent,
      sparkline: quote.sparkline,
    };
  });
  return NextResponse.json({ stocks, count: stocks.length });
}
