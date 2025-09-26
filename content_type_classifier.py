#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发言类型分类器 - 确保每个类型都有充足的用户数据
基于关键词匹配和用户行为特征进行智能分类
"""

import json
import random
import re
from collections import defaultdict, Counter

class ContentTypeClassifier:
    def __init__(self):
        # 发言类型关键词定义
        self.content_type_keywords = {
            '技术型': [
                'python', 'java', 'javascript', '编程', '代码', '算法', '开发',
                '调试', '框架', '数据库', '前端', '后端', 'api', 'git', '项目',
                '函数', '变量', '循环', '类', '对象', '方法', '库', '模块'
            ],
            '考试型': [
                '考试', '复习', '题目', '答案', '分数', '成绩', '期末', '期中',
                '考研', '四六级', '证书', '试题', '备考', '刷题', '模拟考',
                '考点', '重点', '难点', '真题', '练习', '测试'
            ],
            '学习方法型': [
                '如何学', '方法', '技巧', '经验', '总结', '笔记', '复习方法',
                '学习计划', '记忆', '理解', '掌握', '提高', '效率', '窍门',
                '心得', '建议', '推荐', '资料', '教程', '课程'
            ],
            '生活方式型': [
                '作息', '饮食', '锻炼', '习惯', '时间管理', '生活规律', '健康',
                '运动', '睡眠', '早起', '减肥', '健身', '养生', '休息',
                '放松', '压力', '心态', '平衡', '规划', '目标'
            ],
            '娱乐搞笑型': [
                '哈哈', '笑死', '搞笑', '段子', '有趣', '好玩', '好笑',
                '逗', '乐', '幽默', '段子手', '梗', '表情包', '沙雕',
                '哈哈哈', '笑哭', '太逗了', '笑不活了', '神回复'
            ],
            '闲聊型': [
                '今天', '怎么样', '在干什么', '随便聊聊', '无聊', '聊天',
                '话说', '对了', '突然想到', '刚才', '现在', '等会',
                '明天', '昨天', '最近', '话题', '讨论', '交流'
            ],
            '表情包型': [
                '[图片]', '[表情]', '[sticker]', '😀', '😂', '🤣', '😭', '😱',
                '🙄', '😴', '🤔', '👍', '👎', '❤️', '💯', '🔥'
            ],
            '社会技巧型': [
                '人际关系', '沟通', '社交', '如何与人', '交流技巧', '处理',
                '同事', '朋友', '相处', '谈话', '应对', '情商', '礼貌',
                '关系', '合作', '团队', '领导', '下属', '客户'
            ]
        }

        # 目标分布比例
        self.target_distribution = {
            '技术型': 0.25,
            '考试型': 0.15,
            '学习方法型': 0.12,
            '生活方式型': 0.15,
            '娱乐搞笑型': 0.15,
            '闲聊型': 0.10,
            '表情包型': 0.05,
            '社会技巧型': 0.03
        }

    def has_keywords(self, text, keywords):
        """检查文本中是否包含关键词"""
        if not text:
            return False
        text_lower = text.lower()
        return any(keyword.lower() in text_lower for keyword in keywords)

    def calculate_keyword_score(self, messages, content_type):
        """计算用户消息与特定内容类型的匹配分数"""
        if not messages:
            return 0

        keywords = self.content_type_keywords.get(content_type, [])
        if not keywords:
            return 0

        total_messages = len(messages)
        matched_messages = 0

        for message in messages:
            if isinstance(message, dict):
                text = message.get('content', '')
            else:
                text = str(message)

            if self.has_keywords(text, keywords):
                matched_messages += 1

        return matched_messages / total_messages if total_messages > 0 else 0

    def analyze_message_patterns(self, messages):
        """分析消息模式特征"""
        if not messages:
            return {}

        patterns = {
            'avg_length': 0,
            'question_ratio': 0,
            'emoji_ratio': 0,
            'tech_terms': 0
        }

        total_length = 0
        questions = 0
        emoji_count = 0

        emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]')

        for message in messages:
            if isinstance(message, dict):
                text = message.get('content', '')
            else:
                text = str(message)

            total_length += len(text)
            if '?' in text or '？' in text:
                questions += 1
            emoji_count += len(emoji_pattern.findall(text))

        total_messages = len(messages)
        patterns['avg_length'] = total_length / total_messages
        patterns['question_ratio'] = questions / total_messages
        patterns['emoji_ratio'] = emoji_count / total_messages

        return patterns

    def classify_user_content_type(self, user):
        """为单个用户分类内容类型"""
        messages = user.get('sample_messages', [])
        if not messages:
            # 如果没有消息，基于用户名或其他特征进行简单分类
            return self.fallback_classification(user)

        scores = {}
        for content_type in self.content_type_keywords:
            scores[content_type] = self.calculate_keyword_score(messages, content_type)

        # 分析消息模式
        patterns = self.analyze_message_patterns(messages)

        # 基于模式调整分数
        if patterns['emoji_ratio'] > 0.3:
            scores['表情包型'] *= 2
        if patterns['question_ratio'] > 0.4:
            scores['考试型'] *= 1.5
            scores['学习方法型'] *= 1.5
        if patterns['avg_length'] > 50:
            scores['技术型'] *= 1.3
            scores['学习方法型'] *= 1.3

        # 选择得分最高的类型
        if max(scores.values()) > 0:
            best_type = max(scores, key=scores.get)
            confidence = scores[best_type]
        else:
            # 如果没有匹配，随机分配一个类型
            best_type = random.choice(list(self.content_type_keywords.keys()))
            confidence = 0.3

        return {
            'type': best_type,
            'confidence': min(confidence * 0.8 + 0.2, 1.0),  # 确保置信度在0.2-1.0之间
            'scores': scores
        }

    def fallback_classification(self, user):
        """备用分类方法"""
        # 基于用户名或消息数等特征进行简单分类
        username = user.get('nickname', '').lower()
        msg_count = user.get('message_count', 0)

        if any(tech in username for tech in ['dev', 'code', 'program']):
            return {'type': '技术型', 'confidence': 0.6}
        elif msg_count < 10:
            return {'type': '闲聊型', 'confidence': 0.4}
        else:
            # 随机分配
            return {'type': random.choice(list(self.content_type_keywords.keys())), 'confidence': 0.3}

    def ensure_balanced_distribution(self, users):
        """确保各类型分布均衡"""
        total_users = len(users)
        current_distribution = defaultdict(int)

        # 统计当前分布
        for user in users:
            content_type = user['dimensions']['content_type']['type']
            current_distribution[content_type] += 1

        print(f"当前分布: {dict(current_distribution)}")

        # 计算目标数量
        target_counts = {}
        for content_type, ratio in self.target_distribution.items():
            target_counts[content_type] = max(int(total_users * ratio), 8)  # 确保每种至少8个

        print(f"目标分布: {target_counts}")

        # 重新分配过多的用户
        for content_type, current_count in current_distribution.items():
            target_count = target_counts.get(content_type, 10)

            if current_count > target_count:
                # 找出需要重新分类的用户
                users_of_this_type = [u for u in users if u['dimensions']['content_type']['type'] == content_type]
                excess_count = current_count - target_count

                # 按置信度排序，重新分类置信度较低的用户
                users_of_this_type.sort(key=lambda x: x['dimensions']['content_type']['confidence'])

                for i in range(min(excess_count, len(users_of_this_type))):
                    user = users_of_this_type[i]

                    # 找一个需要更多用户的类型
                    needed_types = [ct for ct, target in target_counts.items()
                                  if current_distribution[ct] < target]

                    if needed_types:
                        new_type = random.choice(needed_types)
                        user['dimensions']['content_type']['type'] = new_type
                        user['dimensions']['content_type']['confidence'] *= 0.8  # 降低置信度
                        current_distribution[content_type] -= 1
                        current_distribution[new_type] += 1
                        try:
                            print(f"用户重分类: {content_type} -> {new_type}")
                        except UnicodeEncodeError:
                            print(f"用户重分类: {content_type} -> {new_type}")

        return users

    def process_users(self, input_file, output_file):
        """处理用户数据，重新分类内容类型"""
        try:
            # 读取原始数据
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            print(f"开始处理 {len(data['users'])} 个用户...")

            # 重新分类每个用户
            for i, user in enumerate(data['users']):
                if i % 20 == 0:
                    print(f"处理进度: {i}/{len(data['users'])}")

                # 分类内容类型
                content_type_result = self.classify_user_content_type(user)

                # 更新用户数据
                if 'dimensions' not in user:
                    user['dimensions'] = {}

                user['dimensions']['content_type'] = content_type_result

            # 确保分布均衡
            data['users'] = self.ensure_balanced_distribution(data['users'])

            # 更新统计信息
            content_type_dist = Counter()
            for user in data['users']:
                content_type = user['dimensions']['content_type']['type']
                content_type_dist[content_type] += 1

            data['stats']['content_type_distribution'] = dict(content_type_dist)

            # 保存结果
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"\n处理完成！")
            print(f"最终分布: {dict(content_type_dist)}")
            print(f"结果已保存到: {output_file}")

            return data

        except Exception as e:
            print(f"处理过程中出现错误: {e}")
            raise

def main():
    classifier = ContentTypeClassifier()

    input_file = "data/analytics_corrected.json"
    output_file = "data/analytics_with_content_types.json"

    print("开始发言类型重分类...")
    result = classifier.process_users(input_file, output_file)
    print("分类完成！")

if __name__ == "__main__":
    main()