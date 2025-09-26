#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
时间习惯重新分析脚本
基于新的时间习惯标准重新分析用户的聊天时间模式
"""

import pandas as pd
import numpy as np
import json
from collections import defaultdict
from datetime import datetime

class TimeHabitAnalyzer:
    def __init__(self):
        """初始化时间习惯分析器"""
        self.users_df = None
        self.messages_df = None
        self.time_stats = {}

    def load_data(self):
        """加载原始CSV数据"""
        print("正在加载数据...")
        try:
            self.users_df = pd.read_csv('data/users.csv')
            self.messages_df = pd.read_csv('data/messages.csv')
            print(f"已加载用户数据: {len(self.users_df)} 条")
            print(f"已加载消息数据: {len(self.messages_df)} 条")
            return True
        except Exception as e:
            print(f"数据加载失败: {e}")
            return False

    def extract_hour_from_timestamp(self, timestamp_str):
        """从时间戳字符串中提取小时"""
        try:
            # 尝试多种时间格式
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S',
                '%Y-%m-%d %H:%M',
                '%m/%d/%Y %H:%M:%S',
                '%d/%m/%Y %H:%M:%S'
            ]

            for fmt in formats:
                try:
                    dt = datetime.strptime(str(timestamp_str), fmt)
                    return dt.hour
                except ValueError:
                    continue

            # 如果都失败了，返回None
            return None
        except Exception as e:
            return None

    def analyze_user_time_patterns(self):
        """分析每个用户的时间模式"""
        print("正在分析用户时间模式...")

        # 按用户分组统计每小时发言数
        for user_id in self.users_df['user_id'].unique():
            user_messages = self.messages_df[self.messages_df['user_id'] == user_id]

            # 统计每小时发言数
            hour_counts = defaultdict(int)
            total_messages = 0

            for _, message in user_messages.iterrows():
                hour = self.extract_hour_from_timestamp(message['timestamp'])
                if hour is not None:
                    hour_counts[hour] += 1
                    total_messages += 1

            if total_messages == 0:
                continue

            # 计算各时间段比例
            time_ranges = {
                'early_morning': range(0, 6),    # 0-6点 (熬夜大佬)
                'morning': range(6, 10),         # 6-10点 (早上型)
                'work_hours': range(8, 18),      # 8-18点 (工作/学习时间)
                'evening': range(18, 23),        # 18-23点 (晚上时间)
                'regular_hours': range(8, 24)    # 8-23点 (作息规律)
            }

            range_ratios = {}
            for range_name, hours in time_ranges.items():
                count = sum(hour_counts[h] for h in hours)
                ratio = count / total_messages if total_messages > 0 else 0
                range_ratios[range_name] = ratio

            # 计算细分时间段 (用于检测不规律作息)
            time_segments = {
                'segment_0_6': range(0, 6),
                'segment_6_12': range(6, 12),
                'segment_12_18': range(12, 18),
                'segment_18_24': range(18, 24)
            }

            segment_ratios = {}
            segments_above_20 = 0
            for seg_name, hours in time_segments.items():
                count = sum(hour_counts[h] for h in hours)
                ratio = count / total_messages if total_messages > 0 else 0
                segment_ratios[seg_name] = ratio
                if ratio >= 0.2:  # 20%
                    segments_above_20 += 1

            # 分类用户时间习惯
            time_type = self.classify_time_habit(range_ratios, segments_above_20)

            self.time_stats[str(user_id)] = {
                'hour_counts': dict(hour_counts),
                'total_messages': total_messages,
                'range_ratios': range_ratios,
                'segment_ratios': segment_ratios,
                'segments_above_20_percent': segments_above_20,
                'time_type': time_type,
                'detailed_stats': {
                    'early_morning_ratio': range_ratios['early_morning'],
                    'morning_ratio': range_ratios['morning'],
                    'work_hours_ratio': range_ratios['work_hours'],
                    'evening_ratio': range_ratios['evening'],
                    'regular_hours_ratio': range_ratios['regular_hours']
                }
            }

    def classify_time_habit(self, range_ratios, segments_above_20):
        """
        根据新标准分类时间习惯
        a. 早上型（6-10）----6-10点发言占比>40%
        b. 熬夜大佬（00-06）-----0-6点发言占比>30%
        c. 作息规律（8-23）------8-23点发言占比>80%
        d. 不规律作息型（活跃时间段分散）-------在3个以上时间段都有20%发言
        """

        # 优先级判断
        if range_ratios['morning'] > 0.4:  # 6-10点 > 40%
            return "早上型"
        elif range_ratios['early_morning'] > 0.3:  # 0-6点 > 30%
            return "熬夜大佬"
        elif range_ratios['regular_hours'] > 0.8:  # 8-23点 > 80%
            return "作息规律"
        elif segments_above_20 >= 3:  # 3个以上时间段都有20%发言
            return "不规律作息型"
        else:
            # 默认分类
            if range_ratios['regular_hours'] > 0.6:
                return "作息规律"
            elif range_ratios['early_morning'] > 0.15:
                return "熬夜大佬"
            elif range_ratios['morning'] > 0.25:
                return "早上型"
            else:
                return "不规律作息型"

    def update_analytics_file(self):
        """更新现有的analytics_corrected.json文件"""
        print("正在更新analytics文件...")

        try:
            # 读取现有的analytics文件
            with open('data/analytics_corrected.json', 'r', encoding='utf-8') as f:
                analytics_data = json.load(f)

            # 统计新的时间习惯分布
            time_type_counts = defaultdict(int)

            # 更新每个用户的时间模式数据
            for user in analytics_data['users']:
                user_id = str(user['user_id'])
                if user_id in self.time_stats:
                    time_data = self.time_stats[user_id]

                    # 更新时间模式
                    user['dimensions']['time_pattern'] = {
                        'type': time_data['time_type'],
                        'stats': time_data['detailed_stats'],
                        'hour_distribution': time_data['hour_counts'],
                        'confidence': self.calculate_confidence(time_data)
                    }

                    time_type_counts[time_data['time_type']] += 1

            # 更新总体统计
            analytics_data['stats']['time_habit_distribution'] = dict(time_type_counts)
            analytics_data['stats']['update_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # 保存更新后的文件
            with open('data/analytics_corrected.json', 'w', encoding='utf-8') as f:
                json.dump(analytics_data, f, ensure_ascii=False, indent=2)

            print(f"已更新analytics文件")
            print("时间习惯分布:")
            for habit_type, count in time_type_counts.items():
                print(f"  {habit_type}: {count}人")

        except Exception as e:
            print(f"更新analytics文件失败: {e}")

    def calculate_confidence(self, time_data):
        """计算时间习惯分类的置信度"""
        time_type = time_data['time_type']
        ratios = time_data['range_ratios']

        if time_type == "早上型":
            return min(1.0, ratios['morning'] / 0.4)
        elif time_type == "熬夜大佬":
            return min(1.0, ratios['early_morning'] / 0.3)
        elif time_type == "作息规律":
            return min(1.0, ratios['regular_hours'] / 0.8)
        elif time_type == "不规律作息型":
            return min(1.0, time_data['segments_above_20_percent'] / 3.0)
        else:
            return 0.5

    def run_analysis(self):
        """运行完整的时间习惯分析"""
        print("开始时间习惯重新分析...")

        if not self.load_data():
            return False

        self.analyze_user_time_patterns()
        self.update_analytics_file()

        print("时间习惯分析完成！")
        return True

def main():
    """主函数"""
    analyzer = TimeHabitAnalyzer()
    analyzer.run_analysis()

if __name__ == "__main__":
    main()