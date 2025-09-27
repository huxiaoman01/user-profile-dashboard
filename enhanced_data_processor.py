#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户画像7维度深度数据处理脚本
基于原始聊天数据生成多维度用户画像分析数据
"""

import pandas as pd
import numpy as np
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import jieba
import os

class EnhancedUserProfileProcessor:
    def __init__(self):
        """初始化处理器"""
        self.users_df = None
        self.messages_df = None
        self.processed_users = {}

        # 发言类型分类关键词库
        self.content_type_keywords = {
            '技术型': ['编程', '代码', '算法', '数据结构', '开发', '技术', '程序', 'java', 'python', 'C++', '软件', '系统', '服务器', '数据库'],
            '考试型': ['考试', '复习', '题目', '答案', '成绩', '分数', '试卷', '考研', '期末', '期中', '作业', '练习'],
            '学习方法型': ['学习', '方法', '技巧', '效率', '计划', '笔记', '总结', '经验', '建议', '如何学', '怎么学'],
            '生活方式型': ['宿舍', '食堂', '生活', '作息', '睡觉', '起床', '吃饭', '购物', '日常', '习惯'],
            '娱乐搞笑型': ['哈哈', '笑死', '有趣', '好玩', '搞笑', '段子', '梗', '表情包', '😂', '🤣'],
            '闲聊型': ['聊天', '话说', '对了', '话题', '随便', '无聊', '闲着', '谈论'],
            '表情包型': ['[图片]', '[表情]', '😊', '😂', '🤔', '👍', '❤️', '💪'],
            '社会技巧型': ['人际', '交往', '社交', '沟通', '关系', '朋友', '团队', '合作', '建议', '处理']
        }

        # 情感分析关键词
        self.sentiment_keywords = {
            'positive': ['好', '棒', '赞', '不错', '很好', '优秀', '厉害', '加油', '支持', '开心', '高兴', '满意'],
            'negative': ['不好', '糟糕', '失望', '难过', '生气', '讨厌', '烦', '累', '困难', '问题', '麻烦']
        }

        # 提问关键词
        self.question_keywords = ['？', '?', '吗', '呢', '怎么', '如何', '为什么', '什么', '哪个', '哪里', '求助', '请问']

        # 附和词
        self.agreement_words = ['是的', '对', '对的', '没错', '确实', '同意', '赞成', '好的', '嗯', '哈哈', '👍']

    def load_data(self):
        """加载原始CSV数据"""
        print("正在加载数据...")
        base_path = "用于数据分析的用户数据/data_backup_0901"

        try:
            self.users_df = pd.read_csv(f"{base_path}/users_enhanced.csv", encoding='utf-8')
            messages_df1 = pd.read_csv(f"{base_path}/messages_backup_data_enhanced.csv", encoding='utf-8')
            messages_df2 = pd.read_csv(f"{base_path}/messages_maibot_main_enhanced.csv", encoding='utf-8')

            # 合并消息数据，只过滤武小纺机器人
            self.messages_df = pd.concat([messages_df1, messages_df2], ignore_index=True)
            # 只过滤武小纺机器人(user_id: 3655943918)，其他用户都是真实用户
            self.messages_df = self.messages_df[
                (self.messages_df['user_id'] != 3655943918) &
                (self.messages_df['user_nickname'] != '武小纺')
            ]

            print(f"加载完成：用户数据 {len(self.users_df)} 条，消息数据 {len(self.messages_df)} 条")
            return True

        except Exception as e:
            print(f"数据加载失败：{e}")
            return False

    def calculate_message_volume_dimension(self, user_messages):
        """计算发言量维度分析"""
        total_messages = len(user_messages)
        if total_messages == 0:
            return {
                'level': '极少发言人',
                'total_messages': 0,
                'avg_length': 0,
                'daily_average': 0,
                'rank': 0,
                'percentile': 0
            }

        # 计算平均消息长度
        avg_length = user_messages['message_content'].fillna('').astype(str).str.len().mean()

        # 计算日均消息数
        date_range = user_messages['date'].nunique()
        daily_average = total_messages / max(date_range, 1)

        return {
            'total_messages': total_messages,
            'avg_length': round(avg_length, 1),
            'daily_average': round(daily_average, 1)
        }

    def calculate_time_pattern_dimension(self, user_messages):
        """计算时间习惯维度分析"""
        if len(user_messages) == 0:
            return {'type': '未知', 'distribution': {}, 'peak_hours': []}

        # 时间段分布统计
        hour_counts = user_messages['hour'].value_counts()
        total_messages = len(user_messages)

        time_distribution = {
            '早上(6-10)': user_messages[(user_messages['hour'] >= 6) & (user_messages['hour'] < 10)].shape[0] / total_messages,
            '上午(10-12)': user_messages[(user_messages['hour'] >= 10) & (user_messages['hour'] < 12)].shape[0] / total_messages,
            '下午(12-18)': user_messages[(user_messages['hour'] >= 12) & (user_messages['hour'] < 18)].shape[0] / total_messages,
            '晚上(18-23)': user_messages[(user_messages['hour'] >= 18) & (user_messages['hour'] < 23)].shape[0] / total_messages,
            '深夜(23-6)': user_messages[((user_messages['hour'] >= 23) | (user_messages['hour'] < 6))].shape[0] / total_messages
        }

        # 分类逻辑
        if time_distribution['早上(6-10)'] > 0.4:
            time_type = '早上型'
        elif time_distribution['深夜(23-6)'] > 0.3:
            time_type = '熬夜型'
        elif time_distribution['上午(10-12)'] + time_distribution['下午(12-18)'] + time_distribution['晚上(18-23)'] > 0.8:
            time_type = '作息规律型'
        else:
            # 检查是否在3个以上时间段都有20%发言
            active_periods = sum(1 for ratio in time_distribution.values() if ratio > 0.2)
            if active_periods >= 3:
                time_type = '不规律作息型'
            else:
                time_type = '作息规律型'

        # 获取最活跃的3个小时
        peak_hours = hour_counts.head(3).index.tolist()

        return {
            'type': time_type,
            'distribution': {k: round(v, 3) for k, v in time_distribution.items()},
            'peak_hours': peak_hours,
            'hourly_stats': hour_counts.to_dict()
        }

    def calculate_content_type_dimension(self, user_messages):
        """计算发言类型维度分析"""
        if len(user_messages) == 0:
            return {'primary_type': '未知', 'distribution': {}}

        # 统计各类型关键词出现次数
        type_scores = defaultdict(int)
        total_messages = len(user_messages)

        for _, message in user_messages.iterrows():
            content = str(message.get('message_content', ''))

            for content_type, keywords in self.content_type_keywords.items():
                for keyword in keywords:
                    if keyword in content:
                        type_scores[content_type] += 1
                        break  # 每条消息每种类型最多计1分

        if not type_scores:
            return {
                'primary_type': '闲聊型',
                'distribution': {'闲聊型': 1.0}
            }

        # 计算分布比例
        total_scored = sum(type_scores.values())
        distribution = {k: v/total_scored for k, v in type_scores.items()}

        # 确定主要类型
        primary_type = max(distribution.keys(), key=lambda k: distribution[k])

        return {
            'primary_type': primary_type,
            'distribution': {k: round(v, 3) for k, v in distribution.items()}
        }

    def calculate_social_behavior_dimension(self, user_messages, all_messages):
        """计算社交行为维度分析"""
        if len(user_messages) == 0:
            return {'type': '未知', 'metrics': {}}

        user_id = user_messages.iloc[0]['user_id']
        total_messages = len(user_messages)

        # 计算各项指标

        # 1. 话题发起率 - 首条消息比例（简化版：没有回复关系的消息）
        non_reply_messages = user_messages[user_messages['reply_to'].isna() | (user_messages['reply_to'] == '')]
        initiate_rate = len(non_reply_messages) / total_messages

        # 2. 回复率 - 有回复关系的消息比例
        reply_messages = user_messages[user_messages['reply_to'].notna() & (user_messages['reply_to'] != '')]
        reply_rate = len(reply_messages) / total_messages

        # 3. 提问率
        question_count = 0
        for _, message in user_messages.iterrows():
            content = str(message.get('message_content', ''))
            if any(keyword in content for keyword in self.question_keywords):
                question_count += 1
        question_rate = question_count / total_messages

        # 4. 附和率
        agreement_count = 0
        for _, message in user_messages.iterrows():
            content = str(message.get('message_content', ''))
            if any(word in content for word in self.agreement_words):
                agreement_count += 1
        agreement_rate = agreement_count / total_messages

        # 5. 被@频率（简化版：检查其他人消息中是否提到该用户）
        user_nickname = user_messages.iloc[0]['user_nickname']
        mentioned_count = 0
        for _, message in all_messages.iterrows():
            if message['user_id'] != user_id:  # 其他人的消息
                content = str(message.get('message_content', ''))
                if f'@{user_nickname}' in content or user_nickname in content:
                    mentioned_count += 1
        mention_rate = mentioned_count / len(all_messages) if len(all_messages) > 0 else 0

        # 社交类型判断 - 统一标准
        # 计算综合社交评分
        interaction_score = (initiate_rate * 40 + question_rate * 30 + reply_rate * 20 + mention_rate * 100) * 100
        influence_score = (initiate_rate * 50 + question_rate * 30 + agreement_rate * 20) * 100

        # 统一分类标准
        if initiate_rate > 0.25 or question_rate > 0.15:
            social_type = '主动社交型'
        elif reply_rate > 0.5 or agreement_rate > 0.25:
            social_type = '社交附和型'
        elif mention_rate > 0.001 and reply_rate > 0.3:  # 被提及且有回应
            social_type = '被动社交型'
        else:
            social_type = '社交观察型'

        return {
            'type': social_type,
            'metrics': {
                'initiate_rate': round(initiate_rate, 3),
                'reply_rate': round(reply_rate, 3),
                'question_rate': round(question_rate, 3),
                'agreement_rate': round(agreement_rate, 3),
                'mention_rate': round(mention_rate, 5),
                'interactionScore': round(interaction_score, 1),
                'influenceScore': round(influence_score, 1),
                # 为前端提供百分比格式的数据
                'firstMessageRatio': round(initiate_rate * 100, 1),
                'questionFrequency': round(question_rate * 100, 1),
                'mentionFrequency': round(mention_rate * 1000, 1),  # 转换为千分比
                'replyRatio': round(reply_rate * 100, 1),
                'beMentionedRatio': round(mention_rate * 100, 1)
            }
        }

    def calculate_sentiment_dimension(self, user_messages):
        """计算情感倾向维度分析"""
        if len(user_messages) == 0:
            return {'overall_sentiment': '中性', 'positive_ratio': 0.5, 'negative_ratio': 0.5}

        positive_count = 0
        negative_count = 0

        for _, message in user_messages.iterrows():
            content = str(message.get('message_content', ''))

            # 检查积极词汇
            if any(word in content for word in self.sentiment_keywords['positive']):
                positive_count += 1

            # 检查消极词汇
            if any(word in content for word in self.sentiment_keywords['negative']):
                negative_count += 1

        total_emotional = positive_count + negative_count
        if total_emotional == 0:
            return {
                'overall_sentiment': '中性',
                'positive_ratio': 0.5,
                'negative_ratio': 0.5
            }

        positive_ratio = positive_count / total_emotional
        negative_ratio = negative_count / total_emotional

        # 判断整体情感倾向
        if positive_ratio > 0.6:
            overall_sentiment = '积极型'
        elif negative_ratio > 0.6:
            overall_sentiment = '消极型'
        else:
            overall_sentiment = '中性'

        return {
            'overall_sentiment': overall_sentiment,
            'positive_ratio': round(positive_ratio, 3),
            'negative_ratio': round(negative_ratio, 3)
        }

    def calculate_interaction_style_dimension(self, user_messages):
        """计算提问回答维度分析"""
        if len(user_messages) == 0:
            return {'type': '未知', 'question_ratio': 0, 'answer_ratio': 0}

        total_messages = len(user_messages)
        question_count = 0
        answer_count = 0

        for _, message in user_messages.iterrows():
            content = str(message.get('message_content', ''))

            # 检查是否为提问
            if any(keyword in content for keyword in self.question_keywords):
                question_count += 1

            # 检查是否为回答（包含回复关系或答案性质的词汇）
            if (message.get('reply_to') and message.get('reply_to') != '') or \
               any(word in content for word in ['答案', '解释', '方法', '步骤', '建议', '可以', '应该']):
                answer_count += 1

        question_ratio = question_count / total_messages
        answer_ratio = answer_count / total_messages

        # 判断互动风格
        if question_ratio > 0.4:
            interaction_type = '提问型'
        elif answer_ratio > 0.4:
            interaction_type = '回答型'
        else:
            interaction_type = '平衡型'

        return {
            'type': interaction_type,
            'question_ratio': round(question_ratio, 3),
            'answer_ratio': round(answer_ratio, 3)
        }

    def process_single_user(self, user_id, user_info, user_messages, all_messages):
        """处理单个用户的多维度分析"""

        # 基础信息
        basic_info = {
            'user_id': str(user_id),
            'nickname': user_info.get('nickname', '未知用户'),
            'main_group': user_info.get('group_name', '未知群组'),
            'all_groups': user_info.get('all_groups', [user_info.get('group_name', '未知群组')]),
            'platform': user_info.get('platform', 'unknown')
        }

        # 7维度分析
        dimensions = {
            'message_volume': self.calculate_message_volume_dimension(user_messages),
            'time_pattern': self.calculate_time_pattern_dimension(user_messages),
            'content_type': self.calculate_content_type_dimension(user_messages),
            'social_behavior': self.calculate_social_behavior_dimension(user_messages, all_messages),
            'sentiment': self.calculate_sentiment_dimension(user_messages),
            'interaction_style': self.calculate_interaction_style_dimension(user_messages),
            'member_status': {
                'type': '新成员' if len(user_messages) < 50 else '老成员',  # 简化判断
                'days_active': user_messages['date'].nunique() if len(user_messages) > 0 and 'date' in user_messages.columns else 0
            }
        }

        # 生成综合标签
        tags = []

        # 发言量标签
        msg_count = dimensions['message_volume']['total_messages']
        if msg_count > 200:
            tags.append('🔥话题主导者')
        elif msg_count > 50:
            tags.append('💬稳定发言人')
        elif msg_count > 10:
            tags.append('🤏偶尔发言')
        else:
            tags.append('👀潜水观察')

        # 发言类型标签
        content_type = dimensions['content_type']['primary_type']
        type_emoji = {
            '技术型': '💻', '考试型': '📝', '学习方法型': '📚', '生活方式型': '🏠',
            '娱乐搞笑型': '😄', '闲聊型': '💭', '表情包型': '😊', '社会技巧型': '🤝'
        }
        tags.append(f"{type_emoji.get(content_type, '💭')}{content_type}")

        # 时间习惯标签
        time_type = dimensions['time_pattern']['type']
        time_emoji = {'早上型': '🌅', '熬夜型': '🌙', '作息规律型': '⏰', '不规律作息型': '🔀'}
        tags.append(f"{time_emoji.get(time_type, '⏰')}{time_type}")

        # 社交行为标签
        social_type = dimensions['social_behavior']['type']
        social_emoji = {'主动社交型': '🚀', '社交附和型': '👍', '被动社交型': '📢', '一般社交型': '🤝'}
        tags.append(f"{social_emoji.get(social_type, '🤝')}{social_type}")

        # 情感倾向标签
        sentiment = dimensions['sentiment']['overall_sentiment']
        sentiment_emoji = {'积极型': '☀️', '消极型': '☁️', '中性': '😐'}
        tags.append(f"{sentiment_emoji.get(sentiment, '😐')}{sentiment}")

        # 生成描述
        description_parts = []
        if content_type != '未知':
            description_parts.append(f"{content_type}的")
        if time_type == '熬夜型':
            description_parts.append("深夜活跃")
        elif time_type == '早上型':
            description_parts.append("早起活跃")

        if social_type == '主动社交型':
            description_parts.append("善于发起讨论")
        elif social_type == '社交附和型':
            description_parts.append("乐于回应他人")

        description = "、".join(description_parts) if description_parts else "群聊参与者"

        # 构建完整用户画像
        user_profile = {
            **basic_info,
            'dimensions': dimensions,
            'profile_summary': {
                'tags': tags,
                'description': description,
                'message_count': msg_count,
                'active_days': user_messages['date'].nunique() if len(user_messages) > 0 and 'date' in user_messages.columns else 0
            }
        }

        return user_profile

    def process_all_users(self):
        """处理所有用户数据"""
        print("开始处理用户画像...")

        # 按用户ID分组统计消息
        user_message_groups = self.messages_df.groupby('user_id')

        # 处理用户基础信息去重
        user_info_dict = {}
        for _, user_row in self.users_df.iterrows():
            user_id = user_row['user_id']
            if user_id not in user_info_dict:
                user_info_dict[user_id] = {
                    'nickname': user_row['nickname'],
                    'group_name': user_row['group_name'],
                    'platform': user_row['platform'],
                    'all_groups': [user_row['group_name']]
                }
            else:
                # 合并群组信息
                if user_row['group_name'] not in user_info_dict[user_id]['all_groups']:
                    user_info_dict[user_id]['all_groups'].append(user_row['group_name'])

        processed_users = []
        total_users = len(user_info_dict)

        for i, (user_id, user_info) in enumerate(user_info_dict.items()):
            if i % 50 == 0:
                print(f"处理进度: {i+1}/{total_users}")

            # 获取该用户的所有消息
            if user_id in user_message_groups.groups:
                user_messages = user_message_groups.get_group(user_id)
            else:
                user_messages = pd.DataFrame()  # 空DataFrame

            # 处理该用户
            user_profile = self.process_single_user(user_id, user_info, user_messages, self.messages_df)
            processed_users.append(user_profile)

        print(f"用户画像处理完成，共处理 {len(processed_users)} 个用户")
        return processed_users

    def calculate_global_statistics(self, users_data):
        """计算全局统计数据"""
        print("计算全局统计...")

        # 用户分类统计
        message_volume_stats = Counter()
        time_pattern_stats = Counter()
        content_type_stats = Counter()
        social_behavior_stats = Counter()
        sentiment_stats = Counter()

        total_messages = 0

        for user in users_data:
            dims = user['dimensions']

            # 发言量分类（根据实际消息数动态分类）
            msg_count = dims['message_volume']['total_messages']
            total_messages += msg_count

        # 计算发言量分类阈值
        message_counts = [user['dimensions']['message_volume']['total_messages'] for user in users_data]
        message_counts.sort(reverse=True)

        total_users = len(message_counts)
        thresholds = {
            'major_speaker': message_counts[int(total_users * 0.15)] if total_users > 10 else 100,
            'stable_speaker': message_counts[int(total_users * 0.60)] if total_users > 10 else 20,
            'occasional_speaker': message_counts[int(total_users * 0.85)] if total_users > 10 else 5
        }

        # 重新分类用户并统计
        for user in users_data:
            msg_count = user['dimensions']['message_volume']['total_messages']

            # 发言量分类
            if msg_count >= thresholds['major_speaker']:
                volume_level = '主要发言人'
            elif msg_count >= thresholds['stable_speaker']:
                volume_level = '稳定发言人'
            elif msg_count >= thresholds['occasional_speaker']:
                volume_level = '少量发言人'
            else:
                volume_level = '极少发言人'

            # 更新用户的发言量分类
            user['dimensions']['message_volume']['level'] = volume_level
            message_volume_stats[volume_level] += 1

            # 其他维度统计
            time_pattern_stats[user['dimensions']['time_pattern']['type']] += 1
            content_type_stats[user['dimensions']['content_type']['primary_type']] += 1
            social_behavior_stats[user['dimensions']['social_behavior']['type']] += 1
            sentiment_stats[user['dimensions']['sentiment']['overall_sentiment']] += 1

        # 群组统计
        group_stats = Counter()
        for user in users_data:
            for group in user['all_groups']:
                group_stats[group] += 1

        return {
            'total_users': total_users,
            'total_messages': total_messages,
            'total_groups': len(group_stats),
            'message_volume_distribution': dict(message_volume_stats),
            'time_pattern_distribution': dict(time_pattern_stats),
            'content_type_distribution': dict(content_type_stats),
            'social_behavior_distribution': dict(social_behavior_stats),
            'sentiment_distribution': dict(sentiment_stats),
            'group_distribution': dict(group_stats),
            'thresholds': thresholds,
            'update_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def generate_enhanced_analytics(self):
        """生成增强版分析数据"""
        if not self.load_data():
            return None

        # 处理所有用户
        users_data = self.process_all_users()

        # 计算全局统计
        global_stats = self.calculate_global_statistics(users_data)

        # 构建最终数据结构
        analytics_data = {
            'stats': global_stats,
            'users': users_data,
            'metadata': {
                'processing_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'data_source': 'enhanced_csv_processing',
                'dimensions_count': 7,
                'features': [
                    'message_volume_classification',
                    'time_pattern_analysis',
                    'content_type_classification',
                    'social_behavior_analysis',
                    'sentiment_analysis',
                    'interaction_style_analysis',
                    'member_status_analysis'
                ]
            }
        }

        return analytics_data

    def save_to_json(self, data, filename='enhanced_analytics.json'):
        """保存处理结果到JSON文件"""
        print(f"保存数据到 {filename}...")

        # 确保data目录存在
        os.makedirs('data', exist_ok=True)

        filepath = f"data/{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"数据保存完成：{filepath}")

        # 显示统计摘要
        stats = data['stats']
        print(f"\n=== 处理结果摘要 ===")
        print(f"用户总数: {stats['total_users']}")
        print(f"消息总数: {stats['total_messages']}")
        print(f"群组数量: {stats['total_groups']}")
        print(f"\n发言量分布: {stats['message_volume_distribution']}")
        print(f"时间习惯分布: {stats['time_pattern_distribution']}")
        print(f"发言类型分布: {stats['content_type_distribution']}")


def main():
    """主函数"""
    print("=== 用户画像7维度深度数据处理 ===")

    processor = EnhancedUserProfileProcessor()

    # 生成增强分析数据
    analytics_data = processor.generate_enhanced_analytics()

    if analytics_data:
        # 保存到JSON文件
        processor.save_to_json(analytics_data)

        # 同时保存一份备份到原文件名（兼容现有前端）
        processor.save_to_json(analytics_data, 'analytics.json')

        print("\n处理完成！新的分析数据已生成，支持7维度用户画像分析。")
    else:
        print("数据处理失败！")


if __name__ == "__main__":
    main()