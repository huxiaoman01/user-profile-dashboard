#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 analytics.json 文件中的 NaN 值
将所有 NaN 替换为 null 或者合适的默认值
"""

import json
import re
from pathlib import Path

def fix_json_nan(input_file, output_file):
    """修复JSON文件中的NaN值"""
    print(f"正在读取文件: {input_file}")

    # 读取原始文件内容
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"文件大小: {len(content)} 字符")

    # 统计NaN出现次数
    nan_count = content.count('NaN')
    print(f"发现 {nan_count} 个 NaN 值")

    if nan_count == 0:
        print("没有发现 NaN 值，文件无需修复")
        return

    # 替换所有的 NaN 为 null
    # 注意：要确保不替换字符串中的 "NaN"
    fixed_content = re.sub(r'\bNaN\b', 'null', content)

    # 验证修复后的内容是否为有效JSON
    try:
        json.loads(fixed_content)
        print("JSON验证成功！")
    except json.JSONDecodeError as e:
        print(f"JSON验证失败: {e}")
        return

    # 写入修复后的文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)

    print(f"修复完成！输出文件: {output_file}")
    print(f"替换了 {nan_count} 个 NaN 值为 null")

if __name__ == "__main__":
    input_file = Path("data/analytics.json")
    output_file = Path("data/analytics_fixed.json")

    if not input_file.exists():
        print(f"错误：文件 {input_file} 不存在")
        exit(1)

    fix_json_nan(input_file, output_file)

    # 备份原文件，使用修复后的文件
    backup_file = Path("data/analytics_backup.json")
    print(f"备份原文件到: {backup_file}")
    input_file.rename(backup_file)
    output_file.rename(input_file)

    print("修复完成！原文件已备份，现在使用修复后的文件。")