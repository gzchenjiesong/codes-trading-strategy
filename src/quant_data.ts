/*
    简单的量化分析数据
    数据的粒度默认按照月线进行分析，相当于时间最小单位为月，所以在历史百分位，最高，最低点位时间都是精确到月份
    根据配置会自动分析标的所关联的指数，如果没有关联指数则会以标的自身的数据做代替
*/

import { PluginEnv } from "./plugin_env";


export class QuantData
{
    plugin_env: PluginEnv;
    quant_target: string;

    constructor(plugin_env: PluginEnv)
    {
        this.plugin_env = plugin_env;
    }

}