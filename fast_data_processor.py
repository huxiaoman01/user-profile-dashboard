#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高性能用户画像数据处理脚本 - 优化版
针对大数据量进行性能优化
"""

import pandas as pd
import numpy as np
import json
from collections import Counter, defaultdict
from datetime import datetime
import os

class FastUserProfileProcessor:
    def __init__(self):
        """初始化处理器"""
        self.users_df = None
        self.messages_df = None

        # 简化的关键词库
        self.content_keywords = {
            '技术型': ['编程', '代码', '技术', 'java', 'python', '开发', '算法'],
            '学习型': ['学习', '考试', '复习', '作业', '课程', '成绩'],
            '生活型': ['宿舍', '食堂', '生活', '睡觉', '吃饭'],
            '娱乐型': ['哈哈', '游戏', '好玩', '搞笑', '😂'],
            '闲聊型': ['聊天', '话说', '对了', '无聊']
        }

        self.question_words = ['？', '?', '吗', '怎么', '为什么', '什么']
        self.positive_words = ['好', '棒', '赞', '不错', '开心']
        self.negative_words = ['不好', '糟糕', '难过', '烦']

    def load_data(self):
        """快速加载数据"""
        print("快速加载数据...")
        base_path = "用于数据分析的用户数据/data_backup_0901"

        try:
            # 只读取必要的列
            user_cols = ['user_id', 'nickname', 'group_name', 'platform']
            message_cols = ['user_id', 'hour', 'date', 'message_content', 'reply_to', 'is_ai_message']

            self.users_df = pd.read_csv(f"{base_path}/users_enhanced.csv", encoding='utf-8', usecols=user_cols)

            msg1 = pd.read_csv(f"{base_path}/messages_backup_data_enhanced.csv", encoding='utf-8', usecols=message_cols)
            msg2 = pd.read_csv(f"{base_path}/messages_maibot_main_enhanced.csv", encoding='utf-8', usecols=message_cols)

            # 合并并只过滤武小纺机器人
            self.messages_df = pd.concat([msg1, msg2], ignore_index=True)
            # 只过滤武小纺机器人(user_id: 3655943918)，其他用户都是真实用户
            self.messages_df = self.messages_df[
                (self.messages_df['user_id'] != 3655943918) &
                (self.messages_df.get('user_nickname', '') != '武小纺')
            ]

            # 预处理消息内容
            self.messages_df['message_content'] = self.messages_df['message_content'].fillna('').astype(str)

            print(f"数据加载完成：用户 {len(self.users_df)}, 消息 {len(self.messages_df)}")
            return True

        except Exception as e:
            print(f"数据加载失败：{e}")
            return False

    def classify_content_type(self, messages):
        """快速内容分类"""
        if len(messages) == 0:
            return '闲聊型', 0.5

        type_scores = defaultdict(int)
        total_chars = 0

        for content in messages:
            total_chars += len(content)
            for content_type, keywords in self.content_keywords.items():
                if any(kw in content for kw in keywords):
                    type_scores[content_type] += 1

        if not type_scores:
            return '闲聊型'

        max_type = max(type_scores, key=type_scores.get)

        return max_type

    def analyze_time_pattern(self, hours):
        """快速时间模式分析"""
        if len(hours) == 0:
            return '未知', {}

        hour_counts = Counter(hours)
        total = len(hours)

        # 时段统计
        morning = sum(hour_counts.get(h, 0) for h in range(6, 10)) / total
        evening = sum(hour_counts.get(h, 0) for h in range(18, 23)) / total
        night = sum(hour_counts.get(h, 0) for h in [23, 0, 1, 2, 3, 4, 5]) / total
        regular = sum(hour_counts.get(h, 0) for h in range(8, 23)) / total

        # 简化分类
        if morning > 0.4:
            time_type = '早上型'
        elif night > 0.3:
            time_type = '熬夜型'
        elif regular > 0.8:
            time_type = '规律型'
        else:
            time_type = '不规律型'

        return time_type, {
            'morning_ratio': round(morning, 3),
            'evening_ratio': round(evening, 3),
            'night_ratio': round(night, 3)
        }

    def analyze_social_behavior(self, messages_data):
        """快速社交行为分析"""
        if len(messages_data) == 0:
            return '一般型', {}

        contents = messages_data['message_content'].tolist()
        replies = messages_data['reply_to'].notna().sum()

        # 快速统计
        question_count = sum(1 for content in contents if any(qw in content for qw in self.question_words))

        total = len(contents)
        question_rate = question_count / total
        reply_rate = replies / total

        # 简化分类
        if question_rate > 0.2:
            social_type = '主动型'
        elif reply_rate > 0.5:
            social_type = '附和型'
        else:
            social_type = '一般型'

        return social_type, {
            'question_rate': round(question_rate, 3),
            'reply_rate': round(reply_rate, 3)
        }

    def analyze_sentiment(self, contents):
        """快速情感分析"""
        if len(contents) == 0:
            return '中性', 0.5

        positive_count = sum(1 for content in contents if any(pw in content for pw in self.positive_words))
        negative_count = sum(1 for content in contents if any(nw in content for nw in self.negative_words))

        total_emotional = positive_count + negative_count
        if total_emotional == 0:
            return '中性', 0.5

        positive_ratio = positive_count / total_emotional

        if positive_ratio > 0.6:
            sentiment = '积极型'
        elif positive_ratio < 0.4:
            sentiment = '消极型'
        else:
            sentiment = '中性'

        return sentiment, round(positive_ratio, 3)

    def process_user_fast(self, user_id, user_info, user_messages):
        """快速处理单个用户"""
        msg_count = len(user_messages)

        if msg_count == 0:
            return {
                'user_id': str(user_id),
                'nickname': user_info.get('nickname', '未知'),
                'main_group': user_info.get('group_name', '未知'),
                'message_count': 0,
                'dimensions': {
                    'message_volume': {'level': '极少发言人', 'count': 0},
                    'content_type': {'type': '闲聊型'},
                    'time_pattern': {'type': '未知', 'stats': {}},
                    'social_behavior': {'type': '一般型', 'metrics': {}},
                    'sentiment': {'type': '中性', 'score': 0.5}
                },
                'tags': ['👀潜水观察', '💭闲聊型', '😐中性']
            }

        # 快速分析
        contents = user_messages['message_content'].tolist()
        hours = user_messages['hour'].dropna().tolist()

        content_type = self.classify_content_type(contents)
        time_type, time_stats = self.analyze_time_pattern(hours)
        social_type, social_metrics = self.analyze_social_behavior(user_messages)
        sentiment_type, sentiment_score = self.analyze_sentiment(contents)

        # 生成标签
        tags = []

        # 发言量标签
        if msg_count > 200:
            volume_level = '主要发言人'
            tags.append('🔥话题主导者')
        elif msg_count > 50:
            volume_level = '稳定发言人'
            tags.append('💬稳定发言人')
        elif msg_count > 10:
            volume_level = '少量发言人'
            tags.append('🤏偶尔发言')
        else:
            volume_level = '极少发言人'
            tags.append('👀潜水观察')

        # 类型标签
        type_emoji = {'技术型': '💻', '学习型': '📚', '生活型': '🏠', '娱乐型': '😄', '闲聊型': '💭'}
        tags.append(f"{type_emoji.get(content_type, '💭')}{content_type}")

        # 时间标签
        time_emoji = {'早上型': '🌅', '熬夜型': '🌙', '规律型': '⏰', '不规律型': '🔀'}
        tags.append(f"{time_emoji.get(time_type, '⏰')}{time_type}")

        # 社交标签
        social_emoji = {'主动型': '🚀', '附和型': '👍', '一般型': '🤝'}
        tags.append(f"{social_emoji.get(social_type, '🤝')}{social_type}")

        # 情感标签
        sentiment_emoji = {'积极型': '☀️', '消极型': '☁️', '中性': '😐'}
        tags.append(f"{sentiment_emoji.get(sentiment_type, '😐')}{sentiment_type}")

        return {
            'user_id': str(user_id),
            'nickname': user_info.get('nickname', '未知'),
            'main_group': user_info.get('group_name', '未知群组'),
            'all_groups': user_info.get('all_groups', [user_info.get('group_name', '未知群组')]),
            'message_count': msg_count,
            'avg_message_length': round(np.mean([len(c) for c in contents]), 1) if contents else 0,

            'dimensions': {
                'message_volume': {
                    'level': volume_level,
                    'count': msg_count,
                    'rank': 0  # 后续计算
                },
                'content_type': {
                    'type': content_type
                },
                'time_pattern': {
                    'type': time_type,
                    'stats': time_stats
                },
                'social_behavior': {
                    'type': social_type,
                    'metrics': social_metrics
                },
                'sentiment': {
                    'type': sentiment_type,
                    'score': sentiment_score
                }
            },

            'profile_summary': {
                'tags': tags,
                'description': f"{content_type}的{time_type}用户",
                'active_score': min(msg_count / 100, 1.0)
            }
        }

    def process_all_users_fast(self):
        """快速处理所有用户"""
        print("开始快速处理用户画像...")

        # 预处理用户信息
        user_info_dict = {}
        for _, user_row in self.users_df.iterrows():
            user_id = user_row['user_id']
            if user_id not in user_info_dict:
                user_info_dict[user_id] = {
                    'nickname': user_row['nickname'],
                    'group_name': user_row['group_name'],
                    'platform': user_row.get('platform', 'unknown'),
                    'all_groups': [user_row['group_name']]
                }
            else:
                if user_row['group_name'] not in user_info_dict[user_id]['all_groups']:
                    user_info_dict[user_id]['all_groups'].append(user_row['group_name'])

        # 批量处理消息数据
        user_message_groups = self.messages_df.groupby('user_id')
        processed_users = []

        total_users = len(user_info_dict)
        print(f"需要处理 {total_users} 个用户")

        for i, (user_id, user_info) in enumerate(user_info_dict.items()):
            if i % 100 == 0:
                print(f"处理进度: {i+1}/{total_users}")

            # 获取用户消息
            if user_id in user_message_groups.groups:
                user_messages = user_message_groups.get_group(user_id)
            else:
                user_messages = pd.DataFrame()

            # 快速处理
            user_profile = self.process_user_fast(user_id, user_info, user_messages)
            processed_users.append(user_profile)

        # 计算排名
        processed_users.sort(key=lambda x: x['message_count'], reverse=True)
        for i, user in enumerate(processed_users):
            user['dimensions']['message_volume']['rank'] = i + 1

        print(f"快速处理完成，共 {len(processed_users)} 个用户")
        return processed_users

    def calculate_stats_fast(self, users_data):
        """快速计算统计数据"""
        print("计算全局统计...")

        stats = {
            'total_users': len(users_data),
            'total_messages': sum(u['message_count'] for u in users_data),
            'total_groups': len(set(u['main_group'] for u in users_data)),
            'message_volume_distribution': Counter(),
            'content_type_distribution': Counter(),
            'time_pattern_distribution': Counter(),
            'social_behavior_distribution': Counter(),
            'sentiment_distribution': Counter(),
            'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # 重新分类发言量（基于实际分布）
        message_counts = [u['message_count'] for u in users_data]
        message_counts.sort(reverse=True)

        total = len(message_counts)
        if total > 10:
            # 计算正确的百分位阈值
            # 前15%的下界（主要发言人门槛）
            major_threshold_index = int(total * 0.15) - 1  # 第15%位置
            # 前60%的下界（稳定发言人门槛）
            stable_threshold_index = int(total * 0.60) - 1  # 第60%位置
            # 前85%的下界（少量发言人门槛）
            occasional_threshold_index = int(total * 0.85) - 1  # 第85%位置

            thresholds = {
                'major': message_counts[major_threshold_index] if major_threshold_index >= 0 else message_counts[0],
                'stable': message_counts[stable_threshold_index] if stable_threshold_index >= 0 else 1,
                'occasional': message_counts[occasional_threshold_index] if occasional_threshold_index >= 0 else 1
            }

            print(f"分类阈值计算: 总用户{total}人")
            print(f"主要发言人阈值(前15%): >= {thresholds['major']}条消息")
            print(f"稳定发言人阈值(15-60%): >= {thresholds['stable']}条消息")
            print(f"少量发言人阈值(60-85%): >= {thresholds['occasional']}条消息")
        else:
            thresholds = {'major': 100, 'stable': 20, 'occasional': 5}

        # 更新分类并统计
        for user in users_data:
            msg_count = user['message_count']

            if msg_count >= thresholds['major']:
                level = '主要发言人'
            elif msg_count >= thresholds['stable']:
                level = '稳定发言人'
            elif msg_count >= thresholds['occasional']:
                level = '少量发言人'
            else:
                level = '极少发言人'

            user['dimensions']['message_volume']['level'] = level
            stats['message_volume_distribution'][level] += 1

            # 其他统计
            stats['content_type_distribution'][user['dimensions']['content_type']['type']] += 1
            stats['time_pattern_distribution'][user['dimensions']['time_pattern']['type']] += 1
            stats['social_behavior_distribution'][user['dimensions']['social_behavior']['type']] += 1
            stats['sentiment_distribution'][user['dimensions']['sentiment']['type']] += 1

        # 转换为普通字典
        for key in ['message_volume_distribution', 'content_type_distribution', 'time_pattern_distribution', 'social_behavior_distribution', 'sentiment_distribution']:
            stats[key] = dict(stats[key])

        return stats

    def generate_fast_analytics(self):
        """快速生成分析数据"""
        if not self.load_data():
            return None

        users_data = self.process_all_users_fast()
        stats = self.calculate_stats_fast(users_data)

        return {
            'stats': stats,
            'users': users_data,
            'metadata': {
                'processing_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'processor_version': 'fast_v1.0',
                'features': ['快速发言量分析', '内容类型分类', '时间习惯分析', '社交行为分析', '情感倾向分析']
            }
        }

    def clean_nan_values(self, obj):
        """递归清理对象中的NaN值"""
        if isinstance(obj, dict):
            return {k: self.clean_nan_values(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.clean_nan_values(item) for item in obj]
        elif isinstance(obj, float) and np.isnan(obj):
            return None  # 将NaN转换为None (JSON中的null)
        else:
            return obj

    def save_to_json(self, data, filename='analytics.json'):
        """保存到JSON，确保清理NaN值"""
        print(f"保存数据到 data/{filename}...")

        # 清理NaN值
        print("清理NaN值...")
        clean_data = self.clean_nan_values(data)

        os.makedirs('data', exist_ok=True)
        filepath = f"data/{filename}"

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(clean_data, f, ensure_ascii=False, indent=2)

        print(f"数据已保存到 {filepath}，已清理所有NaN值")

        stats = data['stats']
        print(f"\n=== 快速处理完成 ===")
        print(f"用户总数: {stats['total_users']}")
        print(f"消息总数: {stats['total_messages']}")
        print(f"群组数量: {stats['total_groups']}")
        print(f"发言量分布: {stats['message_volume_distribution']}")
        print(f"内容类型分布: {stats['content_type_distribution']}")

def main():
    print("=== 快速用户画像处理器 ===")

    processor = FastUserProfileProcessor()
    analytics_data = processor.generate_fast_analytics()

    if analytics_data:
        processor.save_to_json(analytics_data)
        print("\n✅ 快速处理完成！现在可以启动前端界面查看结果。")
    else:
        print("❌ 处理失败！")

if __name__ == "__main__":
    main()