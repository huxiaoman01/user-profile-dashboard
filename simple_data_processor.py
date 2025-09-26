#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的数据处理脚本 - 不依赖pandas
只过滤武小纺机器人，生成完整的用户画像数据
"""

import json
import csv
import os
import re
from collections import Counter, defaultdict
from datetime import datetime

class SimpleUserProfileProcessor:
    def __init__(self):
        self.messages = []
        self.users = {}

    def load_data(self):
        """加载CSV数据"""
        base_path = "用于数据分析的用户数据/data_backup_0901"

        print("正在加载数据...")

        # 加载用户数据
        users_file = f"{base_path}/users_enhanced.csv"
        with open(users_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.users[row['user_id']] = {
                    'nickname': row['nickname'],
                    'group_name': row.get('group_name', ''),
                    'platform': row.get('platform', 'qq')
                }

        # 加载消息数据
        message_files = [
            f"{base_path}/messages_backup_data_enhanced.csv",
            f"{base_path}/messages_maibot_main_enhanced.csv"
        ]

        for msg_file in message_files:
            with open(msg_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # 只过滤武小纺机器人
                    if row['user_id'] == '3655943918' or row['user_nickname'] == '武小纺':
                        continue

                    self.messages.append({
                        'user_id': row['user_id'],
                        'nickname': row['user_nickname'],
                        'content': row.get('message_content', ''),
                        'group_name': row.get('group_name', ''),
                        'hour': int(row.get('hour', 0)),
                        'date': row.get('date', '')
                    })

        print(f"数据加载完成：用户 {len(self.users)}，消息 {len(self.messages)}")

    def analyze_user_profiles(self):
        """分析用户画像"""
        user_stats = defaultdict(lambda: {
            'message_count': 0,
            'content': [],
            'groups': set(),
            'group_message_counts': defaultdict(int),  # 统计每个群组的消息数
            'hours': [],
            'nickname': ''
        })

        # 统计用户数据
        for msg in self.messages:
            user_id = msg['user_id']
            user_stats[user_id]['message_count'] += 1
            user_stats[user_id]['content'].append(msg['content'])
            # 只添加非空的群组名，并统计每个群组的消息数
            if msg['group_name'] and msg['group_name'].strip():
                user_stats[user_id]['groups'].add(msg['group_name'])
                user_stats[user_id]['group_message_counts'][msg['group_name']] += 1
            user_stats[user_id]['hours'].append(msg['hour'])
            user_stats[user_id]['nickname'] = msg['nickname']

        # 为没有发消息的用户添加默认统计
        for user_id, user_info in self.users.items():
            if user_id not in user_stats:
                user_stats[user_id] = {
                    'message_count': 0,
                    'content': [],
                    'groups': {user_info['group_name']} if user_info['group_name'] else set(),
                    'group_message_counts': defaultdict(int),
                    'hours': [],
                    'nickname': user_info['nickname']
                }

        # 按发言量排序，计算百分比排名
        sorted_users = sorted(user_stats.items(), key=lambda x: x[1]['message_count'], reverse=True)
        total_users = len(sorted_users)

        print(f"用户总数: {total_users}")
        print(f"发言量分布统计:")
        for i, (user_id, stats) in enumerate(sorted_users[:10]):
            print(f"第{i+1}名: {stats['nickname']} - {stats['message_count']}条消息")

        # 生成用户画像
        users_data = []

        for rank, (user_id, stats) in enumerate(sorted_users):

            # 计算基本指标
            avg_length = sum(len(content) for content in stats['content']) / len(stats['content']) if stats['content'] else 0

            # 时间模式分析
            hour_counter = Counter(stats['hours'])
            morning_count = sum(hour_counter[h] for h in range(6, 12))
            evening_count = sum(hour_counter[h] for h in range(18, 24))
            night_count = sum(hour_counter[h] for h in range(0, 6))

            # 按百分比排名分类用户发言量
            percentile = (rank + 1) / total_users * 100

            if percentile <= 15:  # 前15%
                volume_level = "主要发言人"
            elif percentile <= 60:  # 前15%-60%
                volume_level = "稳定发言人"
            elif percentile <= 85:  # 前60%-85%
                volume_level = "少量发言人"
            else:  # 后15% (85%-100%)
                volume_level = "极少发言人"

            # 内容类型分析（简化版）
            all_content = ' '.join(stats['content'])
            tech_keywords = ['编程', '代码', '技术', 'java', 'python', '开发']
            fun_keywords = ['哈哈', '😂', '好玩', '搞笑']
            life_keywords = ['宿舍', '食堂', '生活', '睡觉']

            if any(keyword in all_content for keyword in tech_keywords):
                content_type = "技术型"
            elif any(keyword in all_content for keyword in fun_keywords):
                content_type = "娱乐型"
            elif any(keyword in all_content for keyword in life_keywords):
                content_type = "生活型"
            else:
                content_type = "闲聊型"

            user_data = {
                'user_id': user_id,
                'nickname': stats['nickname'],
                'main_group': max(stats['group_message_counts'].items(), key=lambda x: x[1])[0] if stats['group_message_counts'] else (list(stats['groups'])[0] if stats['groups'] else ''),
                'all_groups': list(stats['groups']),
                'message_count': stats['message_count'],
                'avg_message_length': round(avg_length, 1),
                'dimensions': {
                    'message_volume': {
                        'level': volume_level,
                        'count': stats['message_count'],
                        'rank': rank + 1  # rank是0开始的，显示时+1
                    },
                    'content_type': {
                        'type': content_type
                    },
                    'time_pattern': {
                        'type': "规律型" if evening_count > night_count else "熬夜型" if stats['message_count'] > 0 else "未知",
                        'stats': {
                            'morning_ratio': morning_count / stats['message_count'] if stats['message_count'] > 0 else 0,
                            'evening_ratio': evening_count / stats['message_count'] if stats['message_count'] > 0 else 0,
                            'night_ratio': night_count / stats['message_count'] if stats['message_count'] > 0 else 0
                        }
                    }
                },
                'profile_summary': {
                    'tags': [
                        f"📊{volume_level}",
                        f"🏷️{content_type}",
                        "⏰规律型" if evening_count > night_count else "🌙熬夜型"
                    ],
                    'description': f"{content_type}的用户",
                    'active_score': min(stats['message_count'] / 200, 1.0)
                }
            }

            users_data.append(user_data)

        # 按消息数量排序
        users_data.sort(key=lambda x: x['message_count'], reverse=True)

        return users_data

    def generate_stats(self, users_data):
        """生成统计数据"""
        total_messages = len(self.messages)
        total_users = len(users_data)

        # 统计分布
        volume_dist = Counter()
        content_dist = Counter()

        for user in users_data:
            volume_dist[user['dimensions']['message_volume']['level']] += 1
            content_dist[user['dimensions']['content_type']['type']] += 1

        return {
            'total_users': total_users,
            'total_messages': total_messages,
            'total_groups': 10,
            'message_volume_distribution': dict(volume_dist),
            'content_type_distribution': dict(content_dist),
            'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def process(self):
        """主处理流程"""
        self.load_data()
        users_data = self.analyze_user_profiles()
        stats = self.generate_stats(users_data)

        # 生成最终数据
        result = {
            'stats': stats,
            'users': users_data
        }

        # 保存到文件
        with open('data/analytics_corrected.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"\\n数据处理完成！")
        print(f"用户数：{stats['total_users']}")
        print(f"消息数：{stats['total_messages']}")
        print(f"已保存到：data/analytics_corrected.json")

        return result

if __name__ == "__main__":
    processor = SimpleUserProfileProcessor()
    processor.process()