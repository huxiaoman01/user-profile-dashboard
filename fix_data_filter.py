#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修正数据过滤逻辑的简单脚本
只过滤武小纺机器人，保留其他所有真实用户数据
"""

import json
import csv
import os
from collections import Counter, defaultdict
from datetime import datetime

def count_messages_without_robot():
    """统计排除武小纺机器人后的消息数据"""
    base_path = "用于数据分析的用户数据/data_backup_0901"

    total_messages = 0
    robot_messages = 0
    user_message_counts = Counter()
    user_nicknames = {}
    group_data = defaultdict(set)

    # 处理两个CSV文件
    csv_files = [
        f"{base_path}/messages_backup_data_enhanced.csv",
        f"{base_path}/messages_maibot_main_enhanced.csv"
    ]

    print("正在统计消息数据...")

    for csv_file in csv_files:
        if not os.path.exists(csv_file):
            print(f"文件不存在: {csv_file}")
            continue

        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_messages += 1
                user_id = row['user_id']
                nickname = row['user_nickname']
                group_name = row.get('group_name', '')

                # 检查是否为武小纺机器人
                if user_id == '3655943918' or nickname == '武小纺':
                    robot_messages += 1
                    continue

                # 统计真实用户数据
                user_message_counts[user_id] += 1
                user_nicknames[user_id] = nickname
                if group_name:
                    group_data[user_id].add(group_name)

    real_user_messages = total_messages - robot_messages

    print(f"统计结果：")
    print(f"总消息数: {total_messages}")
    print(f"武小纺机器人消息: {robot_messages}")
    print(f"真实用户消息: {real_user_messages}")
    print(f"真实用户数量: {len(user_message_counts)}")

    return {
        'total_messages': total_messages,
        'robot_messages': robot_messages,
        'real_user_messages': real_user_messages,
        'user_count': len(user_message_counts),
        'top_users': user_message_counts.most_common(10)
    }

def generate_corrected_stats():
    """生成修正后的简单统计数据"""
    stats = count_messages_without_robot()

    # 基于现有的analytics.json结构生成修正版本
    corrected_data = {
        "stats": {
            "total_users": stats['user_count'],
            "total_messages": stats['real_user_messages'],
            "total_groups": 10,  # 保持不变
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "correction_note": "已修正：只过滤武小纺机器人(ID:3655943918)，保留所有其他真实用户数据"
        }
    }

    print(f"\\n修正后的统计数据:")
    print(f"用户数: {corrected_data['stats']['total_users']}")
    print(f"消息数: {corrected_data['stats']['total_messages']}")

    # 保存到临时文件
    with open('data/corrected_stats.json', 'w', encoding='utf-8') as f:
        json.dump(corrected_data, f, ensure_ascii=False, indent=2)

    print(f"\\n修正统计已保存到: data/corrected_stats.json")
    return corrected_data

if __name__ == "__main__":
    result = generate_corrected_stats()