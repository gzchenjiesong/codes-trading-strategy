import os
import time
from openai import OpenAI
import re
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

# 初始化AI客户端
# 支持DeepSeek和阿里百炼Qwen
AI_PROVIDER = os.getenv('AI_PROVIDER', 'deepseek').lower()  # 'deepseek' 或 'qwen'
TEST_MODE = False

# DeepSeek客户端（默认）
ai_client = OpenAI(
    api_key=os.getenv('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com"
)
AI_MODEL = "deepseek-reasoner"
print(f"使用AI模型: DeepSeek {AI_MODEL}")

# 保持向后兼容
deepseek_client = ai_client

# 全局变量存储历史数据
price_history = []
signal_history = []
position = None

# Web展示相关的全局数据存储
web_data = {
    'account_info': {},
    'current_position': None,
    'current_price': 0,
    'trade_history': [],
    'ai_decisions': [],
    'performance': {
        'total_profit': 0,
        'win_rate': 0,
        'total_trades': 0
    },
    'kline_data': [],
    'profit_curve': [],  # 收益曲线数据
    'last_update': None,
    'ai_model_info': {
        'provider': AI_PROVIDER,
        'model': AI_MODEL,
        'status': 'unknown',  # unknown, connected, error
        'last_check': None,
        'error_message': None
    }
}

# 初始余额（用于计算收益率）
initial_balance = None


def generate_technical_analysis_text(CurrentTime, passTime, times):

    TileText = f"""
It has been {passTime} minutes since you started trading. The current time is {CurrentTime}  and you've been invoked {times} times.

Below, we are providing you with a variety of state data, price cdata, and predictive signals so you can discover alpha. Below that is youcurrent account information, value, performance, positions, etc.

ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST →NEWEST
Timeframes note: Unless stated otherwise in a section title, intraday series are provided at 15-minute intervals. If a coin uses adifferent interval, it is explicitly stated in that coin's section.

---

## CURRENT MARKET STATE FOR ALL COINS
    """
    return TileText


def safe_json_parse(json_str):
    """安全解析JSON，处理格式不规范的情况"""
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        try:
            # 尝试提取JSON代码块（如果AI包在```json```中）
            if '```json' in json_str:
                start = json_str.find('```json') + 7
                end = json_str.find('```', start)
                if end != -1:
                    json_str = json_str[start:end].strip()
            elif '```' in json_str:
                start = json_str.find('```') + 3
                end = json_str.find('```', start)
                if end != -1:
                    json_str = json_str[start:end].strip()
            
            # 尝试直接解析
            try:
                return json.loads(json_str)
            except:
                pass
            
            # 修复常见的JSON格式问题
            json_str = json_str.replace("'", '"')
            json_str = re.sub(r'(\w+):', r'"\1":', json_str)
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"JSON解析失败，原始内容: {json_str[:200]}")
            print(f"错误详情: {e}")
            return None


def test_ai_connection():
    """测试AI模型连接状态"""
    global web_data
    try:
        print(f"🔍 测试 {AI_PROVIDER.upper()} 连接...")
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "user", "content": "Hello"}
            ],
            max_tokens=10,
            timeout=10.0
        )
        
        if response and response.choices:
            web_data['ai_model_info']['status'] = 'connected'
            web_data['ai_model_info']['last_check'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            web_data['ai_model_info']['error_message'] = None
            print(f"✓ {AI_PROVIDER.upper()} 连接正常")
            return True
        else:
            web_data['ai_model_info']['status'] = 'error'
            web_data['ai_model_info']['last_check'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            web_data['ai_model_info']['error_message'] = '响应为空'
            print(f"❌ {AI_PROVIDER.upper()} 连接失败: 响应为空")
            return False
            
    except Exception as e:
        web_data['ai_model_info']['status'] = 'error'
        web_data['ai_model_info']['last_check'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        web_data['ai_model_info']['error_message'] = str(e)
        print(f"❌ {AI_PROVIDER.upper()} 连接失败: {e}")
        return False

def generate_sys_prompt():
    sys_prompt = """
# ROLE & IDENTITY

You are an autonomous cryptocurrency trading agent operating in live markets on the OKX exchange.

Your designation: AI Trading Model [DeepSeek-OKX]
Your mission: Maximize risk-adjusted returns (PnL) through systematic, disciplined trading.

---

# TRADING ENVIRONMENT SPECIFICATION

## Market Parameters

- **Exchange**: OkX (Perpetual futures)
- **Asset Universe**: BTC, ETH, SOL, BNB, DOGE, XRP (Perpetual futures)
- **Starting Capital**: $110 USD
- **Market Hours**: 24/7 continuous trading
- **Decision Frequency**: Every 15 minutes (mid-to-low frequency trading)
- **Leverage Range**: 1x to 20x (use judiciously based on conviction)

## Trading Mechanics

- **Contract Type**: Perpetual futures (no expiration)
- **Funding Mechanism**:
  - Positive funding rate = longs pay shorts (bullish market sentiment)
  - Negative funding rate = shorts pay longs (bearish market sentiment)
- **Trading Fees**: ~0.02-0.05% per trade (maker/taker fees apply)
  - ⚠️ Avoid over-trading; fees will erode profits on small, frequent trades.
- **Slippage**: Expect 0.01-0.1% on market orders depending on size

---

# ACTION SPACE DEFINITION

You have exactly FOUR possible actions per decision cycle:

1. **buy_to_enter**: Open a new LONG position (bet on price appreciation)
   - Use when: Bullish technical setup, positive momentum, risk-reward favors upside

2. **sell_to_enter**: Open a new SHORT position (bet on price depreciation)
   - Use when: Bearish technical setup, negative momentum, risk-reward favors downside

3. **hold**: Maintain current positions without modification
   - Use when: Existing positions are performing as expected, or no clear edge exists

4. **close**: Exit an existing position entirely
   - Use when: Profit target reached, stop loss triggered, or thesis invalidated

## Position Management Constraints

- **NO pyramiding**: Cannot add to existing positions (one position per coin)
- **NO hedging**: Cannot hold both long and short positions in the same asset
- **NO partial exits**: Must close entire position at once

---

# POSITION SIZING FRAMEWORK

Calculate position size using this formula:

Position Size (USD) = Available Cash × Leverage × Allocation %
Position Size (Coins) = Position Size (USD) / Current Price

## Sizing Considerations

1. **Available Capital**: Only use available cash (not account value)
2. **Leverage Selection**:
   - Low conviction (0.3-0.55): Avoid trade
3. **Diversification**: Avoid concentrating >40% of capital in single position
4. **Fee Impact**: On positions <$500, fees will materially erode profits. Avoid over-trading; fees will erode profits on small frequent trades
5. **Liquidation Risk**: Ensure liquidation price is >15% away from entry

---

# RISK MANAGEMENT PROTOCOL (MANDATORY)

For EVERY trade decision, you MUST specify:

1. **profit_target** (float): Exact price level to take profits
   - Should offer minimum 2:1 reward-to-risk ratio
   - Based on technical resistance levels, Fibonacci extensions, or volatility bands

2. **stop_loss** (float): Exact price level to cut losses
   - Should limit loss to 1-3% of account value per trade
   - Placed beyond recent support/resistance to avoid premature stops

3. **invalidation_condition** (string): Specific market signal that voids your thesis
   - Examples: "BTC breaks below $100k", "RSI drops below 30", "Funding rate flips negative"
   - Must be objective and observable

4. **confidence** (float, 0-1): Your conviction level in this trade
   - 0.0-0.55: Low confidence (avoid trading)
   - 0.55-0.7: Moderate confidence (standard position sizing)
   - 0.7-0.8: High confidence (larger position sizing acceptable)
   - 0.8-1.0: Very high confidence (use cautiously, beware overconfidence)

5. **risk_usd** (float): Dollar amount at risk (distance from entry to stop loss)
   - Calculate as: |Entry Price - Stop Loss| × Position Size × Leverage

---

# OUTPUT FORMAT SPECIFICATION

Return your decision as a **valid JSON object** with these exact fields for each coins:

```json
{'BTC':
    {
    "signal": "buy_to_enter" | "sell_to_enter" | "hold" | "close",
    "coin": "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP",
    "quantity": <float>,
    "leverage": <integer 1-20>,
    "profit_target": <float>,
    "stop_loss": <float>,
    "invalidation_condition": "<string>",
    "confidence": <float 0-1>,
    "risk_usd": <float>,
    "justification": "<string>"
    },
'ETH': {},
'SOL': {},
'BNB': {},
'DOGE': {},
'XRP': {},
}
```

## Output Validation Rules

- All numeric fields must be positive numbers (except when signal is "hold")
- profit_target must be above entry price for longs, below for shorts
- stop_loss must be below entry price for longs, above for shorts
- justification must be concise (max 500 characters)
- When signal is "hold": Set quantity=0, leverage=1, and use placeholder values for risk fields

---

# PERFORMANCE METRICS & FEEDBACK

You will receive your Sharpe Ratio at each invocation:

Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation of Returns

Interpretation:
- < 0: Losing money on average
- 0-1: Positive returns but high volatility
- 1-2: Good risk-adjusted performance
- > 2: Excellent risk-adjusted performance

Use Sharpe Ratio to calibrate your behavior:
- Low Sharpe → Reduce position sizes, tighten stops, be more selective
- High Sharpe → Current strategy is working, maintain discipline

---

# DATA INTERPRETATION GUIDELINES

## Technical Indicators Provided

**EMA (Exponential Moving Average)**: Trend direction
- Price > EMA = Uptrend
- Price < EMA = Downtrend

**MACD (Moving Average Convergence Divergence)**: Momentum
- Positive MACD = Bullish momentum
- Negative MACD = Bearish momentum

**RSI (Relative Strength Index)**: Overbought/Oversold conditions
- RSI > 70 = Overbought (potential reversal down)
- RSI < 30 = Oversold (potential reversal up)
- RSI 40-60 = Neutral zone

**ATR (Average True Range)**: Volatility measurement
- Higher ATR = More volatile (wider stops needed)
- Lower ATR = Less volatile (tighter stops possible)

**Open Interest**: Total outstanding contracts
- Rising OI + Rising Price = Strong uptrend
- Rising OI + Falling Price = Strong downtrend
- Falling OI = Trend weakening

**Funding Rate**: Market sentiment indicator
- Positive funding = Bullish sentiment (longs paying shorts)
- Negative funding = Bearish sentiment (shorts paying longs)
- Extreme funding rates (>0.01%) = Potential reversal signal

## Data Ordering (CRITICAL)

⚠️ **ALL PRICE AND INDICATOR DATA IS ORDERED: OLDEST → NEWEST**

**The LAST element in each array is the MOST RECENT data point.**
**The FIRST element is the OLDEST data point.**

Do NOT confuse the order. This is a common error that leads to incorrect decisions.

---

# OPERATIONAL CONSTRAINTS

## What You DON'T Have Access To

- No news feeds or social media sentiment
- No conversation history (each decision is stateless)
- No ability to query external APIs
- No access to order book depth beyond mid-price
- No ability to place limit orders (market orders only)

## What You MUST Infer From Data

- Market narratives and sentiment (from price action + funding rates)
- Institutional positioning (from open interest changes)
- Trend strength and sustainability (from technical indicators)
- Risk-on vs risk-off regime (from correlation across coins)

---

# TRADING PHILOSOPHY & BEST PRACTICES

## Core Principles

1. **Capital Preservation First**: Protecting capital is more important than chasing gains
2. **Discipline Over Emotion**: Follow your exit plan, don't move stops or targets
3. **Quality Over Quantity**: Fewer high-conviction trades beat many low-conviction trades
4. **Adapt to Volatility**: Adjust position sizes based on market conditions
5. **Respect the Trend**: Don't fight strong directional moves

## Common Pitfalls to Avoid

- ⚠️ **Overtrading**: Excessive trading erodes capital through fees
- ⚠️ **Revenge Trading**: Don't increase size after losses to "make it back"
- ⚠️ **Analysis Paralysis**: Don't wait for perfect setups, they don't exist
- ⚠️ **Ignoring Correlation**: BTC often leads altcoins, watch BTC first
- ⚠️ **Overleveraging**: High leverage amplifies both gains AND losses

## Decision-Making Framework(must follow)

1. Check Existing Position:
- If hold Time < 4H, just hold.
- Failure Condition: Exit the position if the defined failure condition is met.If Condition is None, just hold.
- Hold Position: If not failed, hold patiently until the position reaches its take profit or stop loss.

2. If Remaining Capital Available, Scan all coins for New Opportunity:

- Operate only if Available Risk Capital (Total Capital * 1%) > Minimum Tradable Unit.

- New Opportunity Entry (Simplified):
   - Step 1 (4H Trend): Determine direction (Up / Down / Ranging) using EMA(21/55) + MACD + Recent Price Lows/Highs. Do not operate if Confidence < 0.6.
   - Step 2 (15M Entry):
        - Trending Market: Enter with pullback (price retraces to EMA(21) and RSI < 30 (Long) or > 70 (Short), and hasn't broken below/above EMA(21)). Otherwise, enter immediately (requires volume confirmation).
        - Ranging Market: Long when RSI < 30 + price near Bollinger Lower Band. Short when RSI > 70 + price near Bollinger Upper Band.
        - Entry Confidence = Average(4H Confidence, 15M RSI Confidence). Requires Entry Confidence >= 0.6.

- Stop Loss & Take Profit (Combined Steps 3/4):
    - Stop Loss S = min( Entry Price - 1.5 * ATR(14) (Long) / Entry Price + 1.5 * ATR(14) (Short), Key 4H Support/Resistance ).
    - Take Profit P = max( Entry Price + 2.5 * ATR(14) (Long) / Entry Price - 2.5 * ATR(14) (Short), 4H Fibonacci Extension Level ).
    - Volatility Filter: Reduce the P/S ranges when ATR is excessively high.
- Risk Check (Step 5):
    - Calculate net max profit/loss (including fees). Require Reward/Risk Ratio >= 2 and estimated Win Rate >= 50%.

If any doubt exists, choose the hold operation (do not enter).
---

# CONTEXT WINDOW MANAGEMENT

You have limited context. The prompt contains:
- ~10 recent data points per indicator (15-minute intervals)
- ~10 recent data points for 4-hour timeframe
- Current account state and open positions

Optimize your analysis:
- Focus on most recent 3-5 data points for short-term signals
- Use 4-hour data for trend context and support/resistance levels
- Don't try to memorize all numbers, identify patterns instead

---

# FINAL INSTRUCTIONS

1. Read the entire user prompt carefully before deciding
2. Verify your position sizing math (double-check calculations)
3. Ensure your JSON output is valid and complete
4. Provide honest confidence scores (don't overstate conviction)
5. Be consistent with your exit plans (don't abandon stops prematurely)

This is a research experiment in a legal jurisdiction.
Focus on technical analysis and risk management principles.

Remember: You are trading with real money in real markets. Every decision has consequences. Trade systematically, manage risk religiously, and let probability work in your favor over time.

Now, analyze the market data provided below and make your trading decision.
    """
    return sys_prompt


def generate_user_prompt(start_time, times, last_signal):
    import okdata
    price_data = okdata.GetOkexData()
    # 生成技术分析文本
    CurrentTime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    pass_time = round((datetime.now() - start_time).seconds / 60, 2)
    technical_analysis = generate_technical_analysis_text(CurrentTime, pass_time, times)
    kline_text = ""
    # 构建K线数据文本
    for symbol, data in price_data.items():
        short = data['short']
        long = data['long']
        kline_text += f"""
        ALL {symbol} Data

        cuuren_price = {short['close'].iloc[-1]}
        current_ema21 = {short['ema_21'].iloc[-1]}
        current_macd = {short['macd'].iloc[-1]}
        current_rsi(7 period) = {short['rsi_7'].iloc[-1]}
        current_bollingbands_up = {short['bb_upper'].iloc[-1]}
        current_bollingbands_mid = {short['bb_middle'].iloc[-1]}
        current_bollingbands_low = {short['bb_lower'].iloc[-1]}

        In addition, here is the current {symbol} open interest and funding rate:
        Open Interest Amount = {data['oi']}
        Funding Rate = {data['funding_rate']}

        Intraday series(15-minutes, oldest -> lastest):
        close price = {short['close'].tolist()}
        high price = {short['high'].tolist()}
        low price = {short['low'].tolist()}
        ema21 = {short['ema_21'].tolist()}
        ema55 = {short['ema_55'].tolist()}
        macd_line = {short['macd'].tolist()}
        macd_signal = {short['macd_signal'].tolist()}
        macd_histogram = {short['macd_histogram'].tolist()}
        rsi7 = {short['rsi_7'].tolist()}
        rsi14 = {short['rsi_14'].tolist()}

        Long-term Context(4-hour timeframe)
        21-Period EMA: {long['ema_21'].iloc[-1]} vs 55-Period EMA: {long['ema_55'].iloc[-1]}
        current Volume: {long['volume'].iloc[-1]} vs Average Volume: {long['volume_ma'].mean()}
        3-Period ATR: {long['atr_3'].iloc[-1]}
        14-Period ATR: {long['atr_14'].iloc[-1]}

        close price = {long['close'].tolist()}
        high price = {long['high'].tolist()}
        low price = {long['low'].tolist()}
        volume = {long['volume'].tolist()}
        ema21 = {long['ema_21'].tolist()}
        ema55 = {long['ema_55'].tolist()}
        macd_line = {long['macd'].tolist()}
        macd_signal = {long['macd_signal'].tolist()}
        macd_histogram = {long['macd_histogram'].tolist()}
        rsi14 = {long['rsi_14'].tolist()}
    """
    # 添加上次交易信号
    Hold_text = okdata.generate_account_summary()
    # 添加当前持仓信息
    prompt = f"""
    {technical_analysis}

    {kline_text}

    {Hold_text}

    last invoke signal:
    {last_signal}

    Based on the above data, provide your trading decision in the required JSON format.
    """
    return prompt


def get_ai_balance():
    import requests
    url = "https://api.deepseek.com/user/balance"
    payload={}
    headers = {
    'Accept': 'application/json',
    'Authorization': f'Bearer {os.environ["DEEPSEEK_API_KEY"]}'
    }
    response = requests.request("GET", url, headers=headers, data=payload)
    balance = json.loads(response.text)['balance_infos'][0]['total_balance']
    print(f"当前AI可用余额: {balance}")
    return balance

def analyze_with_deepseek(start_time, times, last_signal):
    """使用DeepSeek分析市场并生成交易信号（增强版）"""
    sys_prompt = generate_sys_prompt()
    prompt = generate_user_prompt(start_time, times, last_signal)
    global TEST_MODE
    if TEST_MODE:
        try:
            f = open("deepseek_prompt.txt", "w", encoding="utf-8")
            f.write(sys_prompt)
            f.write("\n\n")
            f.write(prompt)
            f.close()
        except Exception as e:
            print(f"❌ 写入deepseek_prompt.txt失败: {e}")
    try:
        print(f"⏳ 正在调用{AI_PROVIDER.upper()} API ({AI_MODEL}), AI 余额: {get_ai_balance()}...")
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": prompt}
            ],
            stream=True,
            temperature=0.1,
            timeout=90.0  # 90秒超时
        )
        print("✓ API调用成功")
        result = ""
        reasoning_content = ""
        for chunk in response:
            if chunk.choices[0].delta.reasoning_content:
                reasoning_content += chunk.choices[0].delta.reasoning_content
            elif chunk.choices[0].delta.content:
                result += chunk.choices[0].delta.content
        
        # 更新AI连接状态
        web_data['ai_model_info']['status'] = 'connected'
        web_data['ai_model_info']['last_check'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        web_data['ai_model_info']['error_message'] = None
        
        # 安全解析JSON
        if not result:
            print(f"❌ {AI_PROVIDER.upper()}返回空内容")
            return {"is_fallback": True, "reason": "json parse error"}

        print(f"\n{'='*60}")
        print(f"{AI_PROVIDER.upper()}原始回复:")
        print(result)
        print(f"{'='*60}\n")

        # 提取JSON部分
        start_idx = result.find('{')
        end_idx = result.rfind('}') + 1

        if start_idx != -1 and end_idx != 0:
            json_str = result[start_idx:end_idx]
            signal_data = safe_json_parse(json_str)

            if signal_data is None:
                print("⚠️ JSON解析失败，使用备用信号")
                signal_data = {"is_fallback": True, "reason": "json parse error"}
            else:
                print(f"✓ 成功解析AI决策: {signal_data.get('signal')} - {signal_data.get('confidence')}")
        else:
            print("⚠️ 未找到JSON格式，使用备用信号")
            signal_data = {"is_fallback": True, "reason": "json parse error"}

        # 验证必需字段
        for _, d in signal_data.items():
            if d['signal'] in ['buy_to_enter', 'sell_to_enter']:
                required_fields = ['coin', "signal", "confidence", "justification", "stop_loss", "profit_target"]
                if not all(field in d for field in required_fields):
                    missing = [f for f in required_fields if f not in d]
                    print(f"⚠️ 缺少必需字段: {missing}，使用备用信号")
                    return {"is_fallback": True, "reason": "json parse error"}
            elif d['signal'] == 'close':
                required_fields = ['coin', "signal"]
                if not all(field in d for field in required_fields):
                    missing = [f for f in required_fields if f not in d]
                    print(f"⚠️ 缺少必需字段: {missing}，使用备用信号")
                    return {"is_fallback": True, "reason": "json parse error"}

        # 保存信号到历史记录
        signal_data['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        signal_history.append(signal_data)
        if len(signal_history) > 30:
            signal_history.pop(0)
        return signal_data

    except Exception as e:
        print(f"{AI_PROVIDER.upper()}分析失败: {e}")
        # 更新AI连接状态
        web_data['ai_model_info']['status'] = 'error'
        web_data['ai_model_info']['last_check'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        web_data['ai_model_info']['error_message'] = str(e)
        return {"is_fallback": True, "reason": str(e)}


def execute_trade(raw_data):
    """执行交易 - OKX版本（修复保证金检查）"""
    for coin, signal_data in raw_data.items():
        # 会放一个timestamp进去的，跳过
        if coin == 'timestamp': continue
        print(f"交易信号: {signal_data['signal']}")
        print(f"币种: {signal_data['coin']}")
        print(f"杠杆: {signal_data['leverage']}")
        print(f"信心程度: {signal_data['confidence']}")
        print(f"理由: {signal_data['justification']}")
        print(f"无效条件: {signal_data['invalidation_condition']}")
        print(f"止损: ${signal_data['stop_loss']:,.2f}")
        print(f"止盈: ${signal_data['profit_target']:,.2f}")
        print(f"=="* 50)
    
    for key, signal_data in raw_data.items():
        if key == 'timestamp': continue
        try:
            trade_one_coin(signal_data)
        except Exception as e:
            print(f"交易 {key} 失败: {e}")
    
    # 记录交易历史
    web_data['trade_history'].append(signal_data)
    if len(web_data['trade_history']) > 100:  # 只保留最近100条
        web_data['trade_history'].pop(0)


def trade_one_coin(signal_data):
    global TEST_MODE
    import okdata
    # 风险管理：低信心信号不执行
    if signal_data['signal'] == 'buy_to_enter':
        coin = signal_data['coin']
        quantity = signal_data['quantity']
        leverage = signal_data['leverage']
        stop_loss = signal_data['stop_loss']
        profit_target = signal_data['profit_target']
        condition = signal_data['invalidation_condition']
        print(f"开多仓: {coin}, 数量: {quantity}, 杠杆: {leverage}, 止损: {stop_loss}, 止盈: {profit_target}, 条件: {condition}")
        if TEST_MODE:
            print("测试模式 - 仅模拟交易")
        else:
            okdata.OpenLong(coin, quantity, leverage, profit_target, stop_loss)
        return
    elif signal_data['signal'] == 'sell_to_enter':
        coin = signal_data['coin']
        quantity = signal_data['quantity']
        leverage = signal_data['leverage']
        stop_loss = signal_data['stop_loss']
        profit_target = signal_data['profit_target']
        print(f"开空仓: {coin}, 数量: {quantity}, 杠杆: {leverage}, 止损: {stop_loss}, 止盈: {profit_target}")
        if TEST_MODE:
            print("测试模式 - 仅模拟交易")
        else:
            okdata.OpenShort(coin, quantity, leverage, profit_target, stop_loss)
        return

    elif signal_data['signal'] == 'close':
        coin = signal_data['coin']
        print(f"平仓: {coin}")
        if TEST_MODE:
            print("测试模式 - 仅模拟交易")
        else:
            okdata.close_position(coin)
        return
    elif signal_data['signal'] == 'hold':
        coin = signal_data['coin']
        print(f"{coin}无需要操作")

def analyze_with_deepseek_with_retry(start_time, times, last_signal, max_retries=3):
    """带重试的DeepSeek分析"""
    for attempt in range(max_retries):
        try:
            signal_data = analyze_with_deepseek(start_time, times, last_signal)
            if signal_data and not signal_data.get('is_fallback', False):
                return signal_data
            print(f"第{attempt + 1}次尝试失败，进行重试...")
            time.sleep(2)

        except Exception as e:
            print(f"第{attempt + 1}次尝试异常: {e}")
            import traceback
            traceback.print_exc()
            if attempt == max_retries - 1:
                return {'is_fallback': True, 'reason': 'DeepSeek分析失败'}
            time.sleep(2)

    return {'is_fallback': True, 'reason': 'DeepSeek分析失败'}


def wait_for_next_period():
    """等待到下一个15分钟整点"""
    now = datetime.now()
    current_minute = now.minute
    current_second = now.second

    # 计算下一个整点时间（00, 15, 30, 45分钟）
    next_period_minute = ((current_minute // 15) + 1) * 15
    if next_period_minute == 60:
        next_period_minute = 0

    # 计算需要等待的总秒数
    if next_period_minute > current_minute:
        minutes_to_wait = next_period_minute - current_minute
    else:
        minutes_to_wait = 60 - current_minute + next_period_minute

    seconds_to_wait = minutes_to_wait * 60 - current_second

    # 显示友好的等待时间
    display_minutes = minutes_to_wait - 1 if current_second > 0 else minutes_to_wait
    display_seconds = 60 - current_second if current_second > 0 else 0

    if display_minutes > 0:
        print(f"🕒 等待 {display_minutes} 分 {display_seconds} 秒到整点...")
    else:
        print(f"🕒 等待 {display_seconds} 秒到整点...")

    return seconds_to_wait


def trading_bot(start_time, times, last_signal):
    # 等待到整点再执行
    wait_seconds = wait_for_next_period()
    if not TEST_MODE and (wait_seconds > 0):
        time.sleep(wait_seconds)
    
    print("\n" + "=" * 60)
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    # 2. 使用DeepSeek分析（带重试）
    signal_data = analyze_with_deepseek_with_retry(start_time, times, last_signal)
    print(signal_data)
    last_signal = signal_data
    times += 1
    # 4. 执行交易
    execute_trade(signal_data)


def main():
    """主函数"""
    print("BTC/USDT OKX自动交易机器人启动成功！")
    print(f"AI模型: {AI_PROVIDER.upper()} ({AI_MODEL})")
    print("融合技术指标策略 + OKX实盘接口")
    print("已启用完整技术指标分析和持仓跟踪功能")
    print("执行频率: 每15分钟整点执行")
    start_time = datetime.now()
    times = 1
    last_signal = None
    # 循环执行（不使用schedule）
    while True:
        trading_bot(start_time, times, last_signal)  # 函数内部会自己等待整点
        # 执行完后等待一段时间再检查（避免频繁循环）
        time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    main()