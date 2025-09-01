#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小小纺用户画像数据处理脚本
处理CSV数据生成JSON格式供前端展示
"""

import pandas as pd
import json
import re
from collections import Counter
from datetime import datetime
import os

def load_data():
    """加载CSV数据文件"""
    base_path = r"..\..\用于数据分析的用户数据\data_backup_0901"
    
    users_df = pd.read_csv(f"{base_path}\\users_enhanced.csv", encoding='utf-8')
    messages_df = pd.read_csv(f"{base_path}\\messages_backup_data_enhanced.csv", encoding='utf-8')
    messages_main_df = pd.read_csv(f"{base_path}\\messages_maibot_main_enhanced.csv", encoding='utf-8')
    
    # 合并消息数据
    all_messages = pd.concat([messages_df, messages_main_df], ignore_index=True)
    
    return users_df, all_messages

def extract_keywords_from_impression(impression):
    """从用户印象中提取关键词"""
    if pd.isna(impression) or impression == "":
        return []
    
    # 提取关键兴趣点
    keywords = []
    
    # 游戏相关
    game_keywords = ['游戏', 'PUBG', '王者荣耀', '原神', '七日世界', '游戏']
    for keyword in game_keywords:
        if keyword in impression:
            keywords.append('游戏爱好者')
            break
    
    # 学习相关
    study_keywords = ['学习', '专业', '课程', '编程', 'java', 'python', '计算机']
    for keyword in study_keywords:
        if keyword in impression:
            keywords.append('学习导向')
            break
    
    # 技术相关
    tech_keywords = ['技术', '开发', '代码', '服务器', '3D打印', 'NAS']
    for keyword in tech_keywords:
        if keyword in impression:
            keywords.append('技术达人')
            break
    
    # 社交相关
    social_keywords = ['社交', '群主', '协会', '活跃', '互动', '幽默']
    for keyword in social_keywords:
        if keyword in impression:
            keywords.append('社交活跃')
            break
    
    # 生活相关
    life_keywords = ['宿舍', '食堂', '生活', '娱乐', '睡眠', '购物']
    for keyword in life_keywords:
        if keyword in impression:
            keywords.append('生活关注')
            break
    
    return keywords if keywords else ['未分类']

def analyze_user_needs(messages_df):
    """分析用户需求"""
    needs_keywords = {
        '通信服务': ['电话卡', '流量', '套餐', '通信', '网络', '上网'],
        '住宿相关': ['宿舍', '住宿', '房间', '床位', '住房'],
        '学习相关': ['专业', '课程', '选课', '学习', '考试', '成绩'],
        '生活服务': ['食堂', '餐厅', '购物', '超市', '快递', '洗衣'],
        '社交娱乐': ['社团', '活动', '聚会', '游戏', '娱乐', '交友'],
        '校园服务': ['图书馆', '证明', '办理', '缴费', '奖学金']
    }
    
    need_counts = {need: 0 for need in needs_keywords.keys()}
    
    for _, message in messages_df.iterrows():
        if pd.notna(message['message_content']):
            content = str(message['message_content'])
            for need_type, keywords in needs_keywords.items():
                if any(keyword in content for keyword in keywords):
                    need_counts[need_type] += 1
    
    return need_counts

def process_users_data(users_df, messages_df):
    """处理用户数据，去重并分析画像状态"""
    # 用户去重：按user_id合并数据
    user_groups = users_df.groupby('user_id')
    processed_users = []
    
    for user_id, group_data in user_groups:
        # 选择画像最详细的记录
        best_record = group_data.loc[group_data['impression'].str.len().idxmax()] if not group_data['impression'].isna().all() else group_data.iloc[0]
        
        # 收集该用户的所有群组
        user_groups_list = group_data['group_name'].dropna().unique().tolist()
        main_group = best_record['group_name'] if pd.notna(best_record['group_name']) else '未知群组'
        
        # 分析用户消息统计
        user_messages = messages_df[messages_df['user_id'] == user_id]
        message_count = len(user_messages)
        avg_message_length = user_messages['message_content'].str.len().mean() if message_count > 0 else 0
        
        # 判断画像状态
        impression = best_record['impression'] if pd.notna(best_record['impression']) else ''
        portrait_status = analyze_portrait_status(impression, message_count, avg_message_length)
        
        user_data = {
            'user_id': str(user_id),
            'nickname': best_record['nickname'] if pd.notna(best_record['nickname']) else f'用户{user_id}',
            'main_group': main_group,
            'all_groups': user_groups_list,
            'group_count': len(user_groups_list),
            'platform': best_record['platform'] if pd.notna(best_record['platform']) else 'qq',
            'impression': impression,
            'message_count': message_count,
            'avg_message_length': avg_message_length if not pd.isna(avg_message_length) else 0,
            'keywords': extract_keywords_from_impression(impression),
            'portrait_status': portrait_status['status'],
            'portrait_reason': portrait_status['reason'],
            'user_category': categorize_user(message_count, impression)
        }
        processed_users.append(user_data)
    
    return processed_users

def analyze_portrait_status(impression, message_count, avg_message_length):
    """分析用户画像状态和缺失原因"""
    if pd.isna(avg_message_length):
        avg_message_length = 0
        
    if impression and len(impression) > 50:
        return {'status': '完整', 'reason': '画像信息详细完整'}
    elif impression and len(impression) > 10:
        return {'status': '部分', 'reason': '有基础画像信息'}
    elif message_count < 3:
        return {'status': '数据不足', 'reason': f'发言次数过少（{message_count}条）'}
    elif avg_message_length < 5:
        return {'status': '数据不足', 'reason': f'发言内容过短（平均{avg_message_length:.1f}字符）'}
    elif message_count < 10:
        return {'status': '数据不足', 'reason': f'互动不够充分（仅{message_count}条消息）'}
    else:
        return {'status': '待分析', 'reason': '数据充足但尚未生成画像'}

def categorize_user(message_count, impression):
    """用户分类"""
    if impression and len(impression) > 50 and message_count > 20:
        return '高价值用户'
    elif message_count > 10 or (impression and len(impression) > 10):
        return '潜在用户'
    elif message_count > 3:
        return '新用户'
    else:
        return '沉默用户'

def generate_group_stats(users_df):
    """生成群组统计"""
    # 先过滤掉空值和无效群组名
    valid_groups = users_df['group_name'].dropna()
    valid_groups = valid_groups[valid_groups.astype(str).str.strip() != '']  # 过滤空字符串
    valid_groups = valid_groups[valid_groups.astype(str) != 'nan']  # 过滤字符串'nan'
    
    if valid_groups.empty:
        return {'未知群组': len(users_df)}
    
    group_stats = valid_groups.value_counts().to_dict()
    
    # 如果群组名称太长，截断显示
    processed_stats = {}
    for group_name, count in group_stats.items():
        display_name = str(group_name)
        if len(display_name) > 15:
            display_name = display_name[:12] + '...'
        processed_stats[display_name] = count
    
    return processed_stats

def generate_keyword_cloud(users_df, messages_df):
    """生成关键词云数据"""
    # 从用户画像提取关键词
    impression_keywords = []
    for _, user in users_df.iterrows():
        keywords = extract_keywords_from_impression(user['impression'])
        impression_keywords.extend(keywords)
    
    # 从消息内容提取关键词
    message_keywords = []
    common_words = ['的', '了', '是', '我', '你', '在', '有', '和', '就', '都', '不', '一个', '这个', '那个', '可以', '什么', '怎么', '这样', '那样', '知道', '看到', '觉得', '喜欢']
    
    for _, msg in messages_df.iterrows():
        if pd.notna(msg['message_content']) and not msg.get('is_ai_message', False):
            content = str(msg['message_content'])
            # 简单的关键词提取
            if '电话卡' in content or '流量' in content or '套餐' in content:
                message_keywords.append('电话卡需求')
            if '宿舍' in content or '住宿' in content:
                message_keywords.append('住宿咨询')
            if '游戏' in content or '打游戏' in content:
                message_keywords.append('游戏兴趣')
            if '学习' in content or '专业' in content or '课程' in content:
                message_keywords.append('学习相关')
            if '食堂' in content or '吃饭' in content or '外卖' in content:
                message_keywords.append('饮食关注')
    
    # 合并所有关键词
    all_keywords = impression_keywords + message_keywords
    keyword_counts = Counter(all_keywords)
    
    # 过滤掉"未分类"
    filtered_keywords = {k: v for k, v in keyword_counts.items() if k != '未分类'}
    
    # 按权重排序并取前15个
    sorted_keywords = sorted(filtered_keywords.items(), key=lambda x: x[1], reverse=True)[:15]
    
    return [{'text': word, 'weight': count} for word, count in sorted_keywords]

def generate_time_trend_data(messages_df):
    """生成时间趋势数据"""
    if messages_df.empty:
        return {}
    
    # 转换时间格式
    messages_df['datetime'] = pd.to_datetime(messages_df['readable_time'])
    messages_df['date'] = messages_df['datetime'].dt.date
    
    # 每日消息数趋势
    daily_messages = messages_df.groupby('date').size().reset_index(name='message_count')
    daily_messages['date'] = daily_messages['date'].astype(str)
    
    # 每日活跃用户数
    daily_active_users = messages_df.groupby('date')['user_id'].nunique().reset_index(name='active_users')
    daily_active_users['date'] = daily_active_users['date'].astype(str)
    
    # 合并数据
    trend_data = pd.merge(daily_messages, daily_active_users, on='date', how='outer').fillna(0)
    
    return {
        'dates': trend_data['date'].tolist()[-30:],  # 最近30天
        'message_counts': trend_data['message_count'].tolist()[-30:],
        'active_users': trend_data['active_users'].tolist()[-30:]
    }

def generate_heatmap_data(messages_df):
    """生成需求热力图数据"""
    if messages_df.empty:
        return {}
    
    # 定义需求关键词
    need_keywords = {
        '通信服务': ['电话卡', '流量', '套餐', '通信', '网络'],
        '住宿相关': ['宿舍', '住宿', '房间', '床位'],
        '学习相关': ['专业', '课程', '选课', '学习', '考试'],
        '生活服务': ['食堂', '餐厅', '购物', '超市', '快递'],
        '社交娱乐': ['社团', '活动', '聚会', '游戏', '娱乐'],
        '校园服务': ['图书馆', '证明', '办理', '缴费', '奖学金']
    }
    
    # 按小时统计需求
    messages_df['datetime'] = pd.to_datetime(messages_df['readable_time'])
    messages_df['hour'] = messages_df['datetime'].dt.hour
    
    heatmap_matrix = []
    hours = list(range(24))
    
    for need_type, keywords in need_keywords.items():
        hour_counts = [0] * 24
        for hour in hours:
            hour_messages = messages_df[messages_df['hour'] == hour]
            count = 0
            for _, msg in hour_messages.iterrows():
                if pd.notna(msg['message_content']):
                    content = str(msg['message_content'])
                    if any(keyword in content for keyword in keywords):
                        count += 1
            hour_counts[hour] = count
        heatmap_matrix.append(hour_counts)
    
    return {
        'needs': list(need_keywords.keys()),
        'hours': hours,
        'data': heatmap_matrix
    }

def main():
    """主函数"""
    print("开始处理数据...")
    
    # 加载数据
    users_df, messages_df = load_data()
    
    # 处理数据（新增去重和画像分析）
    processed_users = process_users_data(users_df, messages_df)
    need_analysis = analyze_user_needs(messages_df)
    group_stats = generate_group_stats(users_df)
    keyword_cloud = generate_keyword_cloud(users_df, messages_df)
    time_trend = generate_time_trend_data(messages_df)
    heatmap_data = generate_heatmap_data(messages_df)
    
    # 生成统计数据（修正去重后的用户数）
    unique_users = len(processed_users)
    total_messages = len(messages_df)
    total_groups = users_df['group_name'].nunique()
    
    # 用户分类统计
    user_categories = {}
    portrait_status = {}
    for user in processed_users:
        category = user['user_category']
        status = user['portrait_status']
        user_categories[category] = user_categories.get(category, 0) + 1
        portrait_status[status] = portrait_status.get(status, 0) + 1
    
    stats = {
        'total_users': unique_users,
        'total_messages': total_messages,
        'total_groups': total_groups,
        'user_categories': user_categories,
        'portrait_status': portrait_status,
        'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # 组合最终数据
    analytics_data = {
        'stats': stats,
        'users': processed_users,
        'needs_analysis': need_analysis,
        'group_stats': group_stats,
        'keyword_cloud': keyword_cloud,
        'time_trend': time_trend,
        'heatmap_data': heatmap_data
    }
    
    # 保存JSON文件
    with open('data/analytics.json', 'w', encoding='utf-8') as f:
        json.dump(analytics_data, f, ensure_ascii=False, indent=2)
    
    print(f"数据处理完成！")
    print(f"- 去重后用户数: {unique_users}")
    print(f"- 消息总数: {total_messages}")
    print(f"- 群组总数: {total_groups}")
    print(f"- 用户分类: {user_categories}")
    print(f"- 画像状态: {portrait_status}")
    print("- JSON文件已保存到 data/analytics.json")

if __name__ == "__main__":
    main()