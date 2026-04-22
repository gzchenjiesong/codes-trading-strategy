import os
import time
import ccxt
import pandas as pd


from dotenv import load_dotenv
load_dotenv()

# 初始化OKX交易所
exchange = ccxt.okx({
    'options': {
        'defaultType': 'swap',  # OKX使用swap表示永续合约
    },
    'apiKey': os.getenv('OKX_API_KEY'),
    'secret': os.getenv('OKX_SECRET'),
    'password': os.getenv('OKX_PASSWORD'),  # OKX需要交易密码
})

def get_btc_ohlcv_enhanced(Symbol):
    """增强版：获取BTC K线数据并计算技术指标"""
    try:
        # 获取K线数据
        ohlcv = exchange.fetch_ohlcv(Symbol, '15m', limit=100)
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        # 计算技术指标
        # 移动平均线
        import talib
        df['ema_21'] = talib.EMA(df['close'], timeperiod=21)
        df['ema_55'] = talib.EMA(df['close'], timeperiod=55)

        df['bb_upper'], df['bb_middle'], df['bb_lower'] = talib.BBANDS(df['close'], timeperiod=20, nbdevup=2, nbdevdn=2, matype=0)

        # 指数移动平均线
        df['macd'], df['macd_signal'], df['macd_histogram'] = talib.MACD(df['close'], fastperiod=12, slowperiod=26, signalperiod=9)

        # 相对强弱指数 (RSI7)
        df['rsi_7'] = talib.RSI(df['close'], timeperiod=7)
        df['rsi_14'] = talib.RSI(df['close'], timeperiod=14)
        # 填充NaN值
        df = df.bfill().ffill()

        return df.tail(10)
    except Exception as e:
        print(f"获取增强K线数据失败: {e}")
        return None
    


def get_btc_ohlcv_trend(Symbol):
    """增强版：获取BTC K线数据并计算技术指标"""
    try:
        # 获取K线数据
        ohlcv = exchange.fetch_ohlcv(Symbol, '4h', limit=100)
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        import talib
        df['ema_21'] = talib.EMA(df['close'], timeperiod=21)
        df['ema_55'] = talib.EMA(df['close'], timeperiod=55)
        # atr
        df['atr_3'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=3)
        df['atr_14'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
        # 成交量均线
        df['volume_ma'] = talib.SMA(df['volume'], timeperiod=20)
        # MACD
        df['macd'], df['macd_signal'], df['macd_histogram'] = talib.MACD(df['close'], fastperiod=12, slowperiod=26, signalperiod=9)
        # 相对强弱指数 (RSI)
        df['rsi_14'] = talib.RSI(df['close'], timeperiod=14)
        # 填充NaN值
        df = df.bfill().ffill()
        return df.tail(10)
    except Exception as e:
        print(f"获取增强K线数据失败: {e}")
        return None

def get_current_funding_rate(Symbol):
    """获取当前资金费率 - OKX版本"""
    try:
        funding_rate = exchange.fetch_funding_rate(Symbol)
        return float(funding_rate['fundingRate'])
    except Exception as e:
        print(f"获取资金费率失败: {e}")
        return None
    

def get_current_open_interest(Symbol):
    """获取当前持仓量 - OKX版本"""
    try:
        open_interest = exchange.fetch_open_interest(Symbol)
        return float(open_interest['openInterestAmount'])
    except Exception as e:
        print(f"获取持仓量失败: {e}")
        return None

def generate_account_summary():
    """
    生成账户摘要信息
    """
    try:
        # 获取账户余额
        balance = exchange.fetch_balance()
        cash = balance['free']['USDT']  # 可用现金
        total_balance = balance['total']['USDT']  # 账户总值
        # 获取当前持仓
        positions = exchange.fetch_positions()
        open_order = 0
        total_unrealized_pnl = 0
        for pos in positions:
            if float(pos['contracts']) <= 0: continue
            open_order += round(float(pos['collateral']), 2)
            total_unrealized_pnl += float(pos.get('unrealizedPnl', 0))
        # 格式化持仓信息
        Hold_text = f"""

        ## HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
        
        **Performance Metrics:**
        - Current Total Return (percent)": {round((total_balance - 110) / 110 * 100, 2)}%
        - Current Unrealized PNL: ${round(total_unrealized_pnl, 2)}
        - Sharpe Ratio: {CaclSharpRatio()}

        
        **Account Status:**
        - Available Cash: ${round(cash, 2)}
        - **Current Account Value:** ${round(open_order, 2)}

        **Current Live Positions & Performance:**
        """
        if len(positions) == 0:
            Hold_text += """
            No positions
            """

        for pos in positions:
            if float(pos['contracts']) <= 0: continue
            orders = exchange.fetch_open_orders(pos['symbol'], params={'ordType': 'oco'})
            closeSL = -1
            closeTP = -1
            for o in orders:
                closeSL = float(o['info']['slTriggerPx'])
                closeTP = float(o['info']['tpTriggerPx'])
                print(f'coin:{pos["symbol"]} 止损: {closeSL}, 止盈: {closeTP}')
            total_quantity = round(float(pos['notional']), 2)
            risk_usd = round(float(pos['collateral']), 2)
            if closeSL > 0:
                risk_usd = round(float(pos['entryPrice'] - closeSL) * float(pos['contracts']), 2)
            Hold_text += f"""
            symbol: {pos['symbol'].split(':')[0].replace('/', '')},
            quantity: {round(float(pos['contracts']), 2)},
            entry_price: {float(pos['entryPrice'])},
            current_price: {float(pos['markPrice'])},
            liquidation_price: {round(float(pos['liquidationPrice']), 2)},
            unrealizzed_pnl: {round(float(pos.get('unrealizedPnl', 0)), 2)},
            leverage: {int(pos['leverage'])},
            exit_plan:
                profit_target: {closeTP}, # -1 mean no profit target
                stop_loss: {closeSL}, # -1 mean no stop loss
                invalidation_condition: None,
            risk_usd: {risk_usd}, # if no stop loss, risk_usd is the collateral
            hold_time: {round(((time.time() * 1000) - pos['timestamp'])/1000/60, 0)}min,
            notional_usd: {total_quantity} # notional = collateral * leverage
            fee: {round(float(pos['info']['fee']), 2)}
            """
        
        # 构建返回数据
        global MARKET_COIN
        Hold_text += """
        Next is the order information for all coins:

        contractSize: # the value of one contract order = order price * contractSize
        min_amount: # minumum contracts
        """
        for coin in MARKET_COIN:
            order = exchange.fetch_open_orders(coin)
            Hold_text += f"""
            symbol: {coin},
            contractSize: {MARKET_SWAP_INFO[coin]['contractSize']}, 
            max_leverage: {MARKET_SWAP_INFO[coin]['maxLeverage']},
            min_amount: {MARKET_SWAP_INFO[coin]['minAmount']},
        """
        return Hold_text
    except Exception as e:
        print(f"生成账户摘要失败: {e}")
        return None

def GetOkexData():
    data = {}
    global MARKET_COIN
    for s in MARKET_COIN:
        print(f"获取 {s} 数据")
        short_data = get_btc_ohlcv_enhanced(s)
        long_data = get_btc_ohlcv_trend(s)
        funding_rate = get_current_funding_rate(s)
        open_interest = get_current_open_interest(s)
        data[s] = {'short': short_data, 'long': long_data, 'funding_rate': funding_rate, 'oi': open_interest}
    return data


def CaclSharpRatio(risk_free_rate=0.02, annual_factor=365):
    """
    计算夏普比率
    :param risk_free_rate: 无风险利率，默认2%
    :return: 夏普比率
    """
    days = 15
    from datetime import datetime, timedelta
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)
    since = int(start_time.timestamp() * 1000)
    while since < int(end_time.timestamp() * 1000):
        ledgers = exchange.fetch_ledger(None, since, limit=100)
        if not ledgers:
            break
        since = max(ledger['timestamp'] for ledger in ledgers) + 1
        # 添加符合条件的记录（USDT结算币种）
        # 2：交易、5：强平 8：资金费
        daily_balances = {}
        for l in ledgers:
            tradeTime = l['timestamp']
            if tradeTime > since:
                since = tradeTime + 1
            date_str = datetime.utcfromtimestamp(tradeTime/1000).strftime('%Y-%m-%d')
            pnl = float(l['info']['pnl']) + float(l['info']['fee'])
            daily_balances.setdefault(date_str, []).append(pnl)
    daily_pnl = {}
    for date, pnls in daily_balances.items():
        daily_pnl[date] = sum(pnls)
        print(f"{date} 总盈亏: {daily_pnl[date]}")
    
    # 将无风险利率转换为日利率
    daily_rf = risk_free_rate / annual_factor
    # 计算平均超额收益率
    import numpy as np
    import math
    excess_returns = [r - daily_rf for r in daily_pnl.values()]
    mean_excess_return = np.mean(excess_returns)
    # 计算收益率标准差
    std_dev = np.std(excess_returns, ddof=1)  # 使用样本标准差
    # 计算并年化夏普比率
    sharpe = (mean_excess_return / std_dev) * math.sqrt(annual_factor)
    print(f"夏普比率: {sharpe}")
    return round(sharpe, 2)

def GetMostAmount(symbol, amount, leverage):
    balance = exchange.fetch_balance()
    cash = balance['free']['USDT']  # 可用现金
    price = exchange.fetch_ticker(symbol)['last']
    one_price = price * MARKET_SWAP_INFO[symbol]['contractSize']
    print(f"当前可用USDT: {cash}, 当前价格: {price}, 合约大小: {one_price}, 杠杆: {leverage}")
    # 买入需要0.02的费用
    max_amount = cash * 0.998 * leverage / one_price
    return min(max_amount, amount)

def OpenLong(pre, amount, leverage, tpPx=-1, slPx=-1):
    symbol = pre + '/USDT:USDT'
    global MARKET_SWAP_INFO
    if symbol not in MARKET_SWAP_INFO:
        print(f"购买 {symbol} 失败, 未初始化 {symbol}, 暂支持{MARKET_COIN}")
        return None
    
    min_amount = MARKET_SWAP_INFO[symbol]['minAmount']
    if amount <= 0 or amount < min_amount:
        print(f"购买 {symbol} 失败, 购买张数为 {amount}, 最小购买张数为 {min_amount}")
        return None
    old_amount = amount
    amount = GetMostAmount(symbol, amount, leverage)
    print(f"购买 {symbol} 最大可用张数为 {amount}, 计划购买张数为 {old_amount}")
    try:
        print(f"设置逐仓，杠杆为 {leverage} 最小购买个数:{min_amount}")
        exchange.set_leverage(leverage, symbol, params={"marginMode": "isolated", "posSide": "long"})
        print(f"执行购买 {symbol}, 个数为 {amount}, 价格为市价")
        params={
            "positionSide": "long",
            "marginMode": "isolated",
        }
        if slPx > 0:
            params['stopLoss'] = {
                "triggerPrice": slPx,
                # 市价直接sp
                "type": "market",
            }
        if tpPx > 0:
            params['takeProfit'] = {
                "triggerPrice": tpPx,
                # 市价直接tp
                "type": "market",
            }
        order = exchange.create_market_order(
                    symbol,
                    'buy',
                    amount,
                    params=params
                )
    except Exception as e:
        print(f"执行购买 {symbol} 失败: {e}")
        return None
    print(f"购买 {symbol}成功{order}, 成本为 {amount}, 订单ID: {order['id']}")
    return order


def CancelOrder(symbol):
    # buy 取消做多
    # sell 取消做空
    # all 全部取消
    try:
        orders = exchange.fetch_open_orders(symbol)
        for order in orders:
            ret = exchange.cancel_order(order['id'], symbol)
            print(f"取消 {symbol} 订单 {ret} 成功")
    except Exception as e:
        print(f"取消 {symbol} 所有订单失败: {e}")
        return False
    print(f"取消 {symbol} 所有订单成功")
    return True

def OpenShort(pre, amount, leverage, tpPx=-1, slPx=-1):
    symbol = pre + '/USDT:USDT'
    global MARKET_SWAP_INFO
    if symbol not in MARKET_SWAP_INFO:
        print(f"购买 {symbol} 失败, 未初始化 {symbol}, 暂支持{MARKET_COIN}")
        return None
    min_amount = MARKET_SWAP_INFO[symbol]['minAmount']
    if amount <= 0 or amount < min_amount:
        print(f"购买 {symbol} 失败, 总金额为 {total}, 合约价格为 {one_price}, 购买张数为 {amount}, 最小购买张数为 {min_amount}")
        return None
    
    old_amount = amount
    amount = GetMostAmount(symbol, amount, leverage)
    print(f"购买 {symbol} 最大可用张数为 {amount}, 计划购买张数为 {old_amount}")
    
    try:
        print(f"设置逐仓，杠杆为 {leverage} 最小购买个数:{min_amount}")
        exchange.set_leverage(leverage, symbol, params={"marginMode": "isolated", "posSide": "short"})
        print(f"执行购买 {symbol}, 个数为 {amount}, 价格为市价")
        params={
            "positionSide": "short",
            "marginMode": "isolated",
        }
        if slPx > 0:
            params['stopLoss'] = {
                "triggerPrice": slPx,
                # 市价直接sp
                "type": "market",
            }
        if tpPx > 0:
            params['takeProfit'] = {
                "triggerPrice": tpPx,
                # 市价直接tp
                "type": "market",
            }
        order = exchange.create_market_order(
                    symbol,
                    'sell',
                    amount,
                    params=params
                )
    except Exception as e:
        print(f"执行购买 {symbol} 失败: {e}")
        return None
    print(f"购买 {symbol}成功{order}, 成本为 {amount}, 订单ID: {order['id']}")
    return order

def close_position(pre):
    # 取消目前挂单
    symbol = pre + '/USDT:USDT'
    try:
        pos = exchange.fetch_position(symbol=symbol)
        print(f"当前仓位: {pos}")
        if pos['side'] == 'long':
            exchange.close_position(symbol, 'buy', params={"autoCxl": True, 'mgnMode': 'isolated'})
        elif pos['side'] == 'short':
            exchange.close_position(symbol, 'sell', params={"autoCxl": True, 'mgnMode': 'isolated'})
    except Exception as e:
        print(f"关闭 {symbol} 仓位失败: {e}")
        return False
    # 关闭已有仓位
    print(f"关闭 {symbol} 仓位成功")
    return True

def InitBuyInfo(coin_list):
    market_swap_info = {coin: None for coin in coin_list}
    market = exchange.fetch_markets(params={'types': 'swap'})
    # 遍历并提取合约信息
    for market in market:
        # 筛选永续合约市场
        if market['symbol'] not in market_swap_info:
            continue
        market_swap_info[market['symbol']] = {
            'contractSize': market['contractSize'],
            'minAmount': market['limits']['amount']['min'],
            'maxLeverage': market['limits']['leverage']['max'],
        }
    return market_swap_info


MARKET_COIN = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'XRP/USDT:USDT', 'DOGE/USDT:USDT', 'BNB/USDT:USDT']
MARKET_SWAP_INFO = InitBuyInfo(MARKET_COIN)

if __name__ == '__main__':
    # orderId = OpenShort('DOGE', 0.01, 3, tpPx=0.1, slPx=0.22)
    # text = generate_account_summary()
    # print(text)
    # import time
    # time.sleep(10)
    # print("查询订单状态")
    # if orderId is None:
    #     print("购买订单失败")
    #     exit(0)

    text = generate_account_summary()
    print(text)