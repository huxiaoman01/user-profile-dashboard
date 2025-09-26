#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速修复analytics.json中的NaN值
"""

import json
import math

def fix_nan_values(obj):
    """递归修复对象中的NaN值"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = fix_nan_values(value)
    elif isinstance(obj, list):
        return [fix_nan_values(item) for item in obj if not (isinstance(item, float) and math.isnan(item))]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    return obj

def main():
    print("修复analytics.json中的NaN值...")

    # 读取原始数据
    with open('data/analytics.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 修复NaN值
    cleaned_data = fix_nan_values(data)

    # 额外清理用户数据
    if 'users' in cleaned_data:
        for user in cleaned_data['users']:
            if 'all_groups' in user and user['all_groups']:
                # 移除空值和NaN
                user['all_groups'] = [g for g in user['all_groups']
                                    if g is not None and g != '' and str(g) != 'nan']

                # 如果all_groups为空，使用main_group
                if not user['all_groups'] and user.get('main_group'):
                    user['all_groups'] = [user['main_group']]

    # 保存清理后的数据
    with open('data/analytics.json', 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

    print("✅ 数据清理完成！")
    print(f"用户数量: {len(cleaned_data.get('users', []))}")
    print(f"统计信息: {cleaned_data.get('stats', {}).get('total_users', 0)} 用户")

if __name__ == "__main__":
    main()