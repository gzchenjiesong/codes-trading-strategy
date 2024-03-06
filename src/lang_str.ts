
export const SETTING_NAME = new Map<string, string>([
    ["ONE_GRID_LIMIT", "首网上限值"],
    ["MAX_SLUMP_PCT", "最大回撤值"],
    ["TRIGGER_ADD_POINT", "触发价加点"],
    ["MIN_ALIGN_PRICE", "报价单倍数"],
    ["MIN_BATCH_COUNT", "单手份数额"],
    ["MAX_RISE_PCT", "单日最大涨幅"],
    ["SGRID_STEP_PCT", "小网步进值"],
    ["SGRID_RETAIN_COUNT", "保留利润数"],
    ["SGRID_ADD_PCT", "每网追加"],
    ["MGRID_STEP_PCT", "中网步进值"],
    ["MGRID_RETAIN_COUNT", "保留利润数"],
    ["MGRID_ADD_PCT", "每网追加"],
    ["LGRID_STEP_PCT", "大网步进值"],
    ["LGRID_RETAIN_COUNT", "保留利润数"],
    ["LGRID_ADD_PCT", "每网追加"],
    ["DATA_API_LICENCE", "数据接口证书"]
]);

export const SGRID_TYPE_NAME_STR = "小网";
export const MGRID_TYPE_NAME_STR = "中网";
export const LGRID_TYPE_NAME_STR = "大网";
export const PERFIT_TYPE_NAME_STR = "利润";