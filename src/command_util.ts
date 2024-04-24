/*
    处理操作指令，负责解析内容并生成格式化结果
*/

import { subscribe } from "diagnostics_channel";
import { IsNumeric } from "./mymath";

export class GridCommand
{
    command: string;
    command_type: string;
    command_param1: string;
    command_param2: any; 
    data_result_str: string;
    data_result_num: number;
    error_code: number;
    error_msg: string;
    raw_command_text: string;

    constructor()
    {
        this.command = "none";
        this.command_type = "grid";
    }
}

export function ExcuteGridCommand(cmd_str: string): GridCommand
{
    const strs = cmd_str.split(" ");
    const command = new GridCommand();
    command.command = strs[0];
    command.raw_command_text = cmd_str;
    if (command.command == "add_record")
    {
        command.command_param1 = strs[1];
        AddGridRecord(command);
    }
    if (command.command == "del_record")
    {
        command.command_param1 = strs[1];
        DelGridRecord(command);
    }
    return command;
}

function AddGridRecord(command: GridCommand)
{
    const sub_strs = command.command_param1.split(",");
    if (sub_strs.length != 5)
    {
        command.error_code = -1;
        command.error_msg = "invalid param"
        return false;
    }
    if (sub_strs[0] != "BUY" && sub_strs[0] != "SELL" && sub_strs[0] != "SHARE")
    {
        command.error_code = -1;
        command.error_msg = "invalid param"
        return false;
    }
    if (!sub_strs[2].startsWith("小网") && !sub_strs[2].startsWith("中网") && !sub_strs[2].startsWith("大网") && !sub_strs[2].startsWith("红利") && !sub_strs[2].startsWith("利润"))
    {
        command.error_code = -1;
        command.error_msg = "invalid param"
        return false;
    }
    command.error_code = 0;
    command.data_result_str = "\n" + command.command_param1;
    return true;
}

function DelGridRecord(command: GridCommand)
{
    if (IsNumeric(command.command_param1))
    {
        command.error_code = 0;
        command.data_result_num = Number(command.command_param1)
    }
    else
    {
        command.error_code = -1;
        command.error_msg = "invalid param";
    }
}