export const DEFAULT_TAGS = {
  8: "BeginString", 9: "BodyLength", 35: "MsgType", 34: "MsgSeqNum", 49: "SenderCompID",
  56: "TargetCompID", 52: "SendingTime", 10: "CheckSum", 11: "ClOrdID", 37: "OrderID",
  38: "OrderQty", 40: "OrdType", 44: "Price", 54: "Side", 55: "Symbol", 60: "TransactTime",
  150: "ExecType", 39: "OrdStatus", 151: "LeavesQty", 14: "CumQty", 6: "AvgPx",
  453: "NoPartyIDs", 448: "PartyID", 447: "PartyIDSource", 452: "PartyRole",
  1: "Account", 59: "TimeInForce", 64: "SettlDate", 41: "OrigClOrdID",
  128: "DeliverToCompID", 58: "Text", 526: "SecondaryClOrdID",
  30: "LastMkt", 31: "LastPx", 32: "LastQty", 15: "Currency",
  // Groups - Kept tags for name resolution, but logic removed
  552: "NoSides", 555: "NoLegs", 146: "NoRelatedSym", 802: "NoPartySubIDs",
  // Leg Tags
  600: "LegSymbol", 623: "LegRatioQty", 654: "LegRefID", 602: "LegSecurityID",
  603: "LegSecurityIDSource", 556: "LegCurrency", 685: "LegOrderQty", 624: "LegSide",
  588: "LegSettlDate", 609: "LegSecurityType",
  // Party Tags
  523: "PartySubID", 803: "PartySubIDType",
  // Quote/Trade Tags
  537: "QuoteType", 131: "QuoteReqID", 75: "TradeDate"
};

export const DEFAULT_ENUMS = {
  35: { 
    'D': 'NewOrderSingle', '8': 'ExecutionReport', '0': 'Heartbeat', 
    'A': 'Logon', 'F': 'OrderCancelRequest', 'R': 'QuoteRequest', 
    'G': 'OrderCancelReplaceRequest'
  },
  54: { '1': 'Buy', '2': 'Sell', '5': 'Sell Short', '6': 'Sell Short Exempt' },
  39: { '0': 'New', '1': 'PartiallyFilled', '2': 'Filled', '4': 'Canceled', '8': 'Rejected' },
  40: { '1': 'Market', '2': 'Limit', '3': 'Stop', '4': 'Stop Limit' },
  59: { '0': 'Day', '1': 'GTC', '3': 'IOC', '4': 'FOK' },
  452: { '1': 'ExecutingFirm', '2': 'BrokerOfCredit', '3': 'ClientId', '11': 'OrderOriginationTrader', '12': 'ExecutingTrader', '13': 'OrderOriginationFirm' },
  63: { '0': 'Settlement', '1': 'Trade', '2': 'WhenIssued' },
  537: { '1': 'Tradeable', '0': 'Indicative' }
};