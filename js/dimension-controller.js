// 多维度分析控制器
class DimensionController {
    constructor() {
        this.currentDimension = 'message_volume';
        this.currentGroup = '';
        this.filteredUsers = [];
        this.analyticsData = null;
        this.charts = {};

        this.initializeEventListeners();
    }

    // 初始化事件监听
    initializeEventListeners() {
        // 维度切换
        $('#dimensionTabs a').on('click', (e) => {
            e.preventDefault();
            const dimension = $(e.target).closest('a').data('dimension');
            this.switchDimension(dimension);
        });

        // 群组筛选
        $('#groupSelector').on('change', (e) => {
            this.switchGroup(e.target.value);
        });
    }

    // 设置数据
    setData(analyticsData) {
        this.analyticsData = analyticsData;
        // 预处理加群时间数据
        this.preprocessMemberJoinTimeData();
        this.filteredUsers = analyticsData.users;
        this.initializeGroupSelector();
        this.refreshCurrentView();
    }

    // 预处理加群时间数据
    preprocessMemberJoinTimeData() {
        if (!this.analyticsData || !this.analyticsData.users) return;

        const baseDate = new Date('2025-09-01');
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        this.analyticsData.users.forEach(user => {
            // 模拟加群时间：基于用户消息数量和ID生成合理的加群日期
            const joinDate = this.simulateJoinDate(user, baseDate);
            const daysSinceJoin = Math.max(0, Math.floor((baseDate - joinDate) / (24 * 60 * 60 * 1000)));
            const memberType = daysSinceJoin > 30 ? '老成员' : '新成员';

            // 添加加群时间维度数据
            if (!user.dimensions) user.dimensions = {};
            user.dimensions.member_join_time = {
                type: memberType,
                join_date: joinDate.toISOString().split('T')[0], // YYYY-MM-DD格式
                days_since_join: daysSinceJoin,
                join_period: this.getJoinPeriod(daysSinceJoin),
                activity_level: this.calculateMemberActivityLevel(user, daysSinceJoin)
            };
        });
    }

    // 模拟用户加群时间
    simulateJoinDate(user, baseDate) {
        // 基于用户ID和消息数量生成确定性的随机加群时间
        const userIdNum = parseInt(user.user_id) || Math.random() * 1000000;
        const messageCount = user.message_count || 0;

        // 活跃用户倾向于较早加群，不活跃用户倾向于较晚加群
        let daysAgoBase;
        if (messageCount > 100) {
            daysAgoBase = 40 + (userIdNum % 40); // 40-80天前
        } else if (messageCount > 20) {
            daysAgoBase = 20 + (userIdNum % 30); // 20-50天前
        } else if (messageCount > 0) {
            daysAgoBase = (userIdNum % 45); // 0-45天前
        } else {
            daysAgoBase = (userIdNum % 25); // 无发言用户，0-25天前（多数是新成员）
        }

        const joinDate = new Date(baseDate);
        joinDate.setDate(joinDate.getDate() - daysAgoBase);
        return joinDate;
    }

    // 获取加群时间段
    getJoinPeriod(daysSinceJoin) {
        if (daysSinceJoin <= 7) return '最近7天';
        if (daysSinceJoin <= 30) return '8-30天';
        if (daysSinceJoin <= 60) return '31-60天';
        return '60天以上';
    }

    // 计算成员活跃度级别
    calculateMemberActivityLevel(user, daysSinceJoin) {
        const messageCount = user.message_count || 0;
        const avgDaily = daysSinceJoin > 0 ? messageCount / daysSinceJoin : messageCount;

        if (avgDaily > 5) return '高活跃';
        if (avgDaily > 1) return '中活跃';
        if (avgDaily > 0) return '低活跃';
        return '潜水';
    }

    // 初始化群组选择器
    initializeGroupSelector() {
        const groups = new Set();
        this.analyticsData.users.forEach(user => {
            if (user.all_groups && Array.isArray(user.all_groups)) {
                user.all_groups.forEach(group => {
                    if (group && group !== 'NaN' && group.trim() !== '') {
                        groups.add(group);
                    }
                });
            }
        });

        const groupOptions = Array.from(groups).sort().map(group =>
            `<option value="${group}">${group}</option>`
        ).join('');

        $('#groupSelector').html('<option value="">全部群聊</option>' + groupOptions);
    }

    // 切换分析维度
    switchDimension(dimension) {
        console.log(`切换到维度: ${dimension}`);

        this.currentDimension = dimension;

        // 更新UI状态
        $('#dimensionTabs a').removeClass('active');
        $(`#dimensionTabs a[data-dimension="${dimension}"]`).addClass('active');

        // 动态更新用户列表标题
        this.updateUserListTitle(dimension);

        // 切换维度内容显示
        this.switchDimensionContent(dimension);

        // 刷新视图
        this.refreshCurrentView();
    }

    // 动态更新用户列表标题
    updateUserListTitle(dimension) {
        const titleMap = {
            'message_volume': '发言量用户列表',
            'time_pattern': '时间习惯用户列表',
            'content_type': '发言类型用户列表',
            'social_behavior': '社交行为用户列表',
            'member_join_time': '加群时间用户列表'
        };

        const title = titleMap[dimension] || '用户画像列表';
        $('.card-header h5').html(`<i class="fas fa-user-circle"></i> ${title}`);

        // 同时更新表格的列标题
        this.updateTableHeaders(dimension);
    }

    // 更新表格列标题
    updateTableHeaders(dimension) {
        const headerConfigs = {
            'message_volume': [
                '用户昵称', '主要群组', '参与群数', '消息数', '发言分类', '活跃排名', '标签', '操作'
            ],
            'time_pattern': [
                '用户昵称', '主要群组', '参与群数', '消息数', '时间类型', '时间分布', '操作'
            ],
            'content_type': [
                '用户昵称', '主要群组', '参与群数', '消息数', '发言类型', '标签', '操作'
            ],
            'member_join_time': [
                '用户昵称', '主要群组', '参与群数', '在群天数', '成员类型', '加群日期', '标签', '操作'
            ],
            'social_behavior': [
                '用户昵称', '主要群组', '参与群数', '消息数', '社交类型', '社交评分', '标签', '操作'
            ]
        };

        const mobileHeaderConfigs = {
            'message_volume': ['用户', '消息数', '分类', '操作'],
            'time_pattern': ['用户', '消息数', '类型', '操作'],
            'content_type': ['用户', '消息数', '类型', '操作'],
            'member_join_time': ['用户', '天数', '类型', '操作'],
            'social_behavior': ['用户', '消息数', '类型', '操作']
        };

        const headers = headerConfigs[dimension] || headerConfigs['message_volume'];
        const mobileHeaders = mobileHeaderConfigs[dimension] || mobileHeaderConfigs['message_volume'];

        // 更新桌面端表格标题
        const desktopHeaderHtml = headers.map(header => `<th>${header}</th>`).join('');
        $('#usersTable thead tr').html(desktopHeaderHtml);

        // 更新移动端表格标题
        const mobileHeaderHtml = mobileHeaders.map(header => `<th>${header}</th>`).join('');
        $('#usersTableMobile thead tr').html(mobileHeaderHtml);
    }

    // 切换维度内容显示
    switchDimensionContent(dimension) {
        // 隐藏所有维度内容
        $('.dimension-content').addClass('d-none');

        // 显示当前维度的内容
        $(`.dimension-content[data-dimension="${dimension}"]`).removeClass('d-none');

        console.log(`已切换到维度内容: ${dimension}`);
    }

    // 切换群组筛选
    switchGroup(groupName) {
        console.log(`筛选群组: ${groupName || '全部'}`);

        this.currentGroup = groupName;
        this.filterUsersByGroup();
        this.refreshCurrentView();
    }

    // 按群组过滤用户
    filterUsersByGroup() {
        if (!this.currentGroup) {
            this.filteredUsers = this.analyticsData.users;
        } else {
            this.filteredUsers = this.analyticsData.users.filter(user => {
                if (user.all_groups && Array.isArray(user.all_groups)) {
                    return user.all_groups.includes(this.currentGroup);
                }
                return user.main_group === this.currentGroup;
            });
        }

        console.log(`筛选后用户数量: ${this.filteredUsers.length}`);
    }

    // 刷新当前视图
    refreshCurrentView() {
        if (!this.analyticsData) return;

        // 更新统计卡片
        this.updateStatCards();

        // 更新图表
        this.updateCharts();

        // 特殊处理：发言类型分析
        if (this.currentDimension === 'content_type') {
            // 延迟初始化发言类型分析，确保DOM已准备就绪
            setTimeout(() => {
                if (typeof initializeContentTypeAnalysis === 'function') {
                    initializeContentTypeAnalysis();
                }
            }, 200);
        }

        // 更新用户表格
        this.updateUserTable();
    }

    // 更新统计卡片
    updateStatCards() {
        const stats = this.calculateCurrentStats();
        const cardsHtml = this.generateStatCards(stats);
        $('#dynamicStats').html(cardsHtml);

        // 更新内联数据洞察
        this.updateCompactInsights(stats);
    }

    // 更新内联数据洞察
    updateCompactInsights(stats) {
        if (stats.insights && stats.insights.length > 0) {
            // 显示前3条洞察，用分号分隔
            const insights = stats.insights.slice(0, 3);
            const insightsHtml = insights.map(insight => `<span class="insight-item">${insight}</span>`).join(' <span class="text-primary">•</span> ');
            $('#compactInsights').html(`<strong>数据洞察：</strong> ${insightsHtml}`);
        } else {
            $('#compactInsights').html('<span class="text-muted">暂无数据洞察</span>');
        }
    }

    // 计算当前维度统计
    calculateCurrentStats() {
        const users = this.filteredUsers;

        switch (this.currentDimension) {
            case 'message_volume':
                return this.calculateMessageVolumeStats(users);
            case 'time_pattern':
                return this.calculateTimePatternStats(users);
            case 'content_type':
                return this.calculateContentTypeStats(users);
            case 'social_behavior':
                return this.calculateSocialBehaviorStats(users);
            case 'member_join_time':
                return this.calculateMemberJoinTimeStats(users);
            default:
                return {};
        }
    }

    // 发言量维度统计
    calculateMessageVolumeStats(users) {
        const distribution = {};
        let totalMessages = 0;
        let topUsers = [];

        users.forEach(user => {
            const level = user.dimensions?.message_volume?.level || '未知';
            distribution[level] = (distribution[level] || 0) + 1;
            totalMessages += user.message_count || 0;

            topUsers.push({
                nickname: user.nickname,
                count: user.message_count || 0,
                level: level
            });
        });

        // 获取top 10用户
        topUsers.sort((a, b) => b.count - a.count);
        topUsers = topUsers.slice(0, 10);

        return {
            type: 'message_volume',
            title: '发言量分析',
            total_users: users.length,
            total_messages: totalMessages,
            avg_messages: Math.round(totalMessages / users.length) || 0,
            distribution,
            top_users: topUsers,
            insights: this.generateMessageVolumeInsights(distribution, totalMessages, users.length)
        };
    }

    // 生成发言量洞察
    generateMessageVolumeInsights(distribution, totalMessages, totalUsers) {
        const insights = [];

        const majorCount = distribution['主要发言人'] || 0;
        const majorRatio = (majorCount / totalUsers * 100).toFixed(1);
        insights.push(`主要发言人占比 ${majorRatio}%，贡献了大部分讨论内容`);

        const silentCount = distribution['极少发言人'] || 0;
        const silentRatio = (silentCount / totalUsers * 100).toFixed(1);
        if (silentRatio > 20) {
            insights.push(`${silentRatio}% 的用户很少发言，属于潜水用户`);
        }

        const avgMessages = Math.round(totalMessages / totalUsers);
        insights.push(`平均每人发言 ${avgMessages} 条消息`);

        return insights;
    }

    // 加群时间维度统计
    calculateMemberJoinTimeStats(users) {
        const distribution = {};
        const periodDistribution = {};
        const activityDistribution = {};
        let totalDaysSinceJoin = 0;
        let oldMemberMessages = 0;
        let newMemberMessages = 0;
        let topNewMembers = [];
        let topOldMembers = [];

        users.forEach(user => {
            const memberData = user.dimensions?.member_join_time;
            if (!memberData) return;

            const type = memberData.type;
            const period = memberData.join_period;
            const activity = memberData.activity_level;
            const daysSinceJoin = memberData.days_since_join;

            // 统计分布
            distribution[type] = (distribution[type] || 0) + 1;
            periodDistribution[period] = (periodDistribution[period] || 0) + 1;
            activityDistribution[activity] = (activityDistribution[activity] || 0) + 1;

            // 累计统计
            totalDaysSinceJoin += daysSinceJoin;

            if (type === '老成员') {
                oldMemberMessages += user.message_count || 0;
                topOldMembers.push({
                    nickname: user.nickname,
                    count: user.message_count || 0,
                    days: daysSinceJoin,
                    activity: activity
                });
            } else {
                newMemberMessages += user.message_count || 0;
                topNewMembers.push({
                    nickname: user.nickname,
                    count: user.message_count || 0,
                    days: daysSinceJoin,
                    activity: activity
                });
            }
        });

        // 排序获取top用户
        topOldMembers.sort((a, b) => b.count - a.count);
        topNewMembers.sort((a, b) => b.count - a.count);

        const oldMemberCount = distribution['老成员'] || 0;
        const newMemberCount = distribution['新成员'] || 0;
        const avgDays = users.length > 0 ? Math.round(totalDaysSinceJoin / users.length) : 0;

        return {
            type: 'member_join_time',
            title: '加群时间分析',
            total_users: users.length,
            distribution,
            period_distribution: periodDistribution,
            activity_distribution: activityDistribution,
            avg_days_since_join: avgDays,
            old_member_count: oldMemberCount,
            new_member_count: newMemberCount,
            old_member_messages: oldMemberMessages,
            new_member_messages: newMemberMessages,
            old_member_avg_messages: oldMemberCount > 0 ? Math.round(oldMemberMessages / oldMemberCount) : 0,
            new_member_avg_messages: newMemberCount > 0 ? Math.round(newMemberMessages / newMemberCount) : 0,
            top_old_members: topOldMembers.slice(0, 10),
            top_new_members: topNewMembers.slice(0, 10),
            insights: this.generateMemberJoinTimeInsights(distribution, avgDays, oldMemberCount, newMemberCount, oldMemberMessages, newMemberMessages)
        };
    }

    // 生成加群时间洞察
    generateMemberJoinTimeInsights(distribution, avgDays, oldCount, newCount, oldMessages, newMessages) {
        const insights = [];
        const totalUsers = oldCount + newCount;

        if (totalUsers === 0) return insights;

        const oldRatio = (oldCount / totalUsers * 100).toFixed(1);
        const newRatio = (newCount / totalUsers * 100).toFixed(1);

        insights.push(`群组中有 ${oldRatio}% 的老成员，${newRatio}% 的新成员`);

        if (oldCount > 0 && newCount > 0) {
            const oldAvg = Math.round(oldMessages / oldCount);
            const newAvg = Math.round(newMessages / newCount);

            if (oldAvg > newAvg * 1.5) {
                insights.push(`老成员平均活跃度 (${oldAvg}条) 显著高于新成员 (${newAvg}条)`);
            } else if (newAvg > oldAvg * 1.2) {
                insights.push(`新成员表现活跃，平均发言 (${newAvg}条) 超过老成员 (${oldAvg}条)`);
            } else {
                insights.push(`新老成员活跃度相近，分别为 ${newAvg} 和 ${oldAvg} 条消息`);
            }
        }

        insights.push(`群组成员平均在群时间为 ${avgDays} 天`);

        if (newRatio > 40) {
            insights.push(`新成员占比较高，群组正在快速发展`);
        } else if (newRatio < 20) {
            insights.push(`以老成员为主，群组相对稳定`);
        }

        return insights;
    }

    // 发言类型维度统计
    calculateContentTypeStats(users) {
        const distribution = {};
        let topUsers = [];

        users.forEach(user => {
            const contentType = user.dimensions?.content_type?.type || '未知';
            distribution[contentType] = (distribution[contentType] || 0) + 1;

            topUsers.push({
                nickname: user.nickname,
                count: user.message_count || 0,
                type: contentType
            });
        });

        // 按消息数排序
        topUsers.sort((a, b) => b.count - a.count);

        return {
            type: 'content_type',
            title: '发言类型分析',
            total_users: users.length,
            distribution,
            top_users: topUsers.slice(0, 10),
            insights: this.generateContentTypeInsights(distribution, users.length)
        };
    }

    // 生成发言类型洞察
    generateContentTypeInsights(distribution, totalUsers) {
        const insights = [];

        if (totalUsers === 0) return insights;

        // 找出最大的类型
        let maxType = '';
        let maxCount = 0;
        Object.entries(distribution).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        });

        const maxRatio = (maxCount / totalUsers * 100).toFixed(1);
        insights.push(`${maxType}是最主要的发言类型，占比${maxRatio}%`);

        // 技术型分析
        const techCount = distribution['技术型'] || 0;
        const techRatio = (techCount / totalUsers * 100).toFixed(1);
        if (techRatio > 20) {
            insights.push(`${techRatio}%的用户偏向技术讨论，群组技术氛围浓厚`);
        }

        // 娱乐型分析
        const funCount = distribution['娱乐搞笑型'] || 0;
        const funRatio = (funCount / totalUsers * 100).toFixed(1);
        if (funRatio > 15) {
            insights.push(`${funRatio}%的用户喜欢娱乐搞笑，群组氛围轻松活跃`);
        }

        // 学习型分析
        const studyCount = (distribution['考试型'] || 0) + (distribution['学习方法型'] || 0);
        const studyRatio = (studyCount / totalUsers * 100).toFixed(1);
        if (studyRatio > 20) {
            insights.push(`${studyRatio}%的用户关注学习，适合开展学习交流活动`);
        }

        return insights;
    }

    // 时间习惯维度统计
    calculateTimePatternStats(users) {
        const distribution = {};
        const hourDistribution = {};
        let topMorningUsers = [];
        let topNightOwlUsers = [];
        let regularUsers = [];
        let irregularUsers = [];

        users.forEach(user => {
            const timeData = user.dimensions?.time_pattern;
            if (!timeData) return;

            const type = timeData.type || '未知';
            const hourData = timeData.hour_distribution || {};
            const stats = timeData.stats || {};

            // 统计分布
            distribution[type] = (distribution[type] || 0) + 1;

            // 累计小时分布
            Object.entries(hourData).forEach(([hour, count]) => {
                hourDistribution[hour] = (hourDistribution[hour] || 0) + count;
            });

            // 分类用户
            const userInfo = {
                nickname: user.nickname,
                count: user.message_count || 0,
                type: type,
                stats: stats
            };

            if (type === '早上型') {
                topMorningUsers.push(userInfo);
            } else if (type === '熬夜大佬') {
                topNightOwlUsers.push(userInfo);
            } else if (type === '作息规律') {
                regularUsers.push(userInfo);
            } else if (type === '不规律作息型') {
                irregularUsers.push(userInfo);
            }
        });

        // 排序用户列表
        topMorningUsers.sort((a, b) => b.stats.morning_ratio - a.stats.morning_ratio);
        topNightOwlUsers.sort((a, b) => b.stats.early_morning_ratio - a.stats.early_morning_ratio);
        regularUsers.sort((a, b) => b.stats.regular_hours_ratio - a.stats.regular_hours_ratio);
        irregularUsers.sort((a, b) => b.count - a.count);

        // 计算整体统计
        const totalUsers = users.length;
        const morningCount = distribution['早上型'] || 0;
        const nightOwlCount = distribution['熬夜大佬'] || 0;
        const regularCount = distribution['作息规律'] || 0;
        const irregularCount = distribution['不规律作息型'] || 0;

        return {
            type: 'time_pattern',
            title: '时间习惯分析',
            total_users: totalUsers,
            distribution,
            hour_distribution: hourDistribution,
            morning_users_count: morningCount,
            night_owl_count: nightOwlCount,
            regular_users_count: regularCount,
            irregular_users_count: irregularCount,
            top_morning_users: topMorningUsers.slice(0, 10),
            top_night_owl_users: topNightOwlUsers.slice(0, 10),
            top_regular_users: regularUsers.slice(0, 10),
            top_irregular_users: irregularUsers.slice(0, 10),
            insights: this.generateTimePatternInsights(distribution, totalUsers, hourDistribution)
        };
    }

    // 生成时间习惯洞察
    generateTimePatternInsights(distribution, totalUsers, hourDistribution) {
        const insights = [];

        if (totalUsers === 0) return insights;

        // 分析时间习惯分布
        const regularCount = distribution['作息规律'] || 0;
        const morningCount = distribution['早上型'] || 0;
        const nightOwlCount = distribution['熬夜大佬'] || 0;
        const irregularCount = distribution['不规律作息型'] || 0;

        const regularRatio = (regularCount / totalUsers * 100).toFixed(1);
        const morningRatio = (morningCount / totalUsers * 100).toFixed(1);
        const nightOwlRatio = (nightOwlCount / totalUsers * 100).toFixed(1);
        const irregularRatio = (irregularCount / totalUsers * 100).toFixed(1);

        insights.push(`作息规律用户占 ${regularRatio}%，是群组的主要构成`);

        if (morningRatio > 10) {
            insights.push(`${morningRatio}% 的用户是早起型，6-10点活跃度高`);
        }

        if (nightOwlRatio > 10) {
            insights.push(`${nightOwlRatio}% 的用户是熬夜大佬，0-6点仍然活跃`);
        }

        if (irregularRatio > 20) {
            insights.push(`${irregularRatio}% 的用户作息不规律，活跃时间分散`);
        }

        // 分析最活跃时间段
        let maxHour = '12';
        let maxCount = 0;
        Object.entries(hourDistribution).forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxHour = hour;
            }
        });

        const timeRange = this.getTimeRangeDescription(parseInt(maxHour));
        insights.push(`群组最活跃时间是${maxHour}点 (${timeRange})`);

        return insights;
    }

    // 获取时间段描述
    getTimeRangeDescription(hour) {
        if (hour >= 6 && hour < 10) return '早上时段';
        if (hour >= 10 && hour < 14) return '上午时段';
        if (hour >= 14 && hour < 18) return '下午时段';
        if (hour >= 18 && hour < 22) return '晚上时段';
        if (hour >= 22 || hour < 6) return '深夜时段';
        return '其他时段';
    }

    // 生成统计卡片HTML
    generateStatCards(stats) {
        if (!stats.type) return '';

        switch (stats.type) {
            case 'message_volume':
                return this.generateMessageVolumeCards(stats);
            case 'member_join_time':
                return this.generateMemberJoinTimeCards(stats);
            case 'time_pattern':
                return this.generateTimePatternCards(stats);
            case 'content_type':
                return this.generateContentTypeCards(stats);
            default:
                return '<div class="col-12"><p class="text-muted">暂未实现该维度的统计卡片</p></div>';
        }
    }

    // 生成发言量统计卡片
    generateMessageVolumeCards(stats) {
        return `
            <div class="col-md-3">
                <div class="card border-primary">
                    <div class="card-body text-center">
                        <div class="display-4 text-primary">${stats.total_users}</div>
                        <h5 class="card-title">筛选用户数</h5>
                        <p class="text-muted mb-0">当前筛选范围内的用户总数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <div class="display-4 text-success">${stats.total_messages.toLocaleString()}</div>
                        <h5 class="card-title">总发言数</h5>
                        <p class="text-muted mb-0">筛选用户的消息总量</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <div class="display-4 text-info">${stats.avg_messages}</div>
                        <h5 class="card-title">人均发言</h5>
                        <p class="text-muted mb-0">平均每人发言条数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-warning">
                    <div class="card-body text-center">
                        <div class="display-4 text-warning">${stats.distribution['主要发言人'] || 0}</div>
                        <h5 class="card-title">活跃用户</h5>
                        <p class="text-muted mb-0">主要发言人数量</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 生成加群时间统计卡片
    generateMemberJoinTimeCards(stats) {
        const oldRatio = stats.total_users > 0 ? ((stats.old_member_count / stats.total_users) * 100).toFixed(1) : 0;
        const newRatio = stats.total_users > 0 ? ((stats.new_member_count / stats.total_users) * 100).toFixed(1) : 0;

        return `
            <div class="col-md-3">
                <div class="card border-primary">
                    <div class="card-body text-center">
                        <div class="display-4 text-primary">${stats.total_users}</div>
                        <h5 class="card-title">总用户数</h5>
                        <p class="text-muted mb-0">当前筛选范围内的用户总数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <div class="display-4 text-info">${stats.old_member_count}</div>
                        <h5 class="card-title">老成员 <span class="text-muted fs-6">(${oldRatio}%)</span></h5>
                        <p class="text-muted mb-0">加群超过30天的成员</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-warning">
                    <div class="card-body text-center">
                        <div class="display-4 text-warning">${stats.new_member_count}</div>
                        <h5 class="card-title">新成员 <span class="text-muted fs-6">(${newRatio}%)</span></h5>
                        <p class="text-muted mb-0">加群30天内的成员</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <div class="display-4 text-success">${stats.avg_days_since_join}</div>
                        <h5 class="card-title">平均在群天数</h5>
                        <p class="text-muted mb-0">成员平均在群时间</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 生成发言类型统计卡片
    generateContentTypeCards(stats) {
        const distribution = stats.distribution;
        const techCount = distribution['技术型'] || 0;
        const studyCount = (distribution['考试型'] || 0) + (distribution['学习方法型'] || 0);
        const funCount = distribution['娱乐搞笑型'] || 0;
        const chatCount = distribution['闲聊型'] || 0;

        const techRatio = stats.total_users > 0 ? (techCount / stats.total_users * 100).toFixed(1) : '0.0';
        const studyRatio = stats.total_users > 0 ? (studyCount / stats.total_users * 100).toFixed(1) : '0.0';
        const funRatio = stats.total_users > 0 ? (funCount / stats.total_users * 100).toFixed(1) : '0.0';
        const chatRatio = stats.total_users > 0 ? (chatCount / stats.total_users * 100).toFixed(1) : '0.0';

        return `
            <div class="col-md-3">
                <div class="card border-primary">
                    <div class="card-body text-center">
                        <div class="display-4 text-primary">${techCount}</div>
                        <h5 class="card-title">
                            <i class="fas fa-code text-primary me-1"></i>
                            技术型 <span class="text-muted fs-6">(${techRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">偏向技术讨论和编程</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <div class="display-4 text-success">${studyCount}</div>
                        <h5 class="card-title">
                            <i class="fas fa-graduation-cap text-success me-1"></i>
                            学习型 <span class="text-muted fs-6">(${studyRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">关注考试和学习方法</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-warning">
                    <div class="card-body text-center">
                        <div class="display-4 text-warning">${funCount}</div>
                        <h5 class="card-title">
                            <i class="fas fa-laugh text-warning me-1"></i>
                            娱乐型 <span class="text-muted fs-6">(${funRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">喜欢分享趣事和搞笑内容</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <div class="display-4 text-info">${chatCount}</div>
                        <h5 class="card-title">
                            <i class="fas fa-comments text-info me-1"></i>
                            闲聊型 <span class="text-muted fs-6">(${chatRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">日常随意聊天为主</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 生成时间习惯统计卡片
    generateTimePatternCards(stats) {
        const regularRatio = stats.regular_users_count > 0 ? (stats.regular_users_count / stats.total_users * 100).toFixed(1) : '0.0';
        const morningRatio = stats.morning_users_count > 0 ? (stats.morning_users_count / stats.total_users * 100).toFixed(1) : '0.0';
        const nightOwlRatio = stats.night_owl_count > 0 ? (stats.night_owl_count / stats.total_users * 100).toFixed(1) : '0.0';
        const irregularRatio = stats.irregular_users_count > 0 ? (stats.irregular_users_count / stats.total_users * 100).toFixed(1) : '0.0';

        return `
            <div class="col-md-3">
                <div class="card border-success">
                    <div class="card-body text-center">
                        <div class="display-4 text-success">${stats.regular_users_count}</div>
                        <h5 class="card-title">
                            <i class="fas fa-circle text-success me-1" style="color: #28a745 !important;"></i>
                            作息规律 <span class="text-muted fs-6">(${regularRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">8-23点发言占比>80%</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-info">
                    <div class="card-body text-center">
                        <div class="display-4 text-info">${stats.morning_users_count}</div>
                        <h5 class="card-title">
                            <i class="fas fa-circle me-1" style="color: #17a2b8 !important;"></i>
                            早上型 <span class="text-muted fs-6">(${morningRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">6-10点发言占比>40%</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-warning">
                    <div class="card-body text-center">
                        <div class="display-4 text-warning">${stats.night_owl_count}</div>
                        <h5 class="card-title">
                            <i class="fas fa-circle me-1" style="color: #ffc107 !important;"></i>
                            熬夜大佬 <span class="text-muted fs-6">(${nightOwlRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">0-6点发言占比>30%</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-danger">
                    <div class="card-body text-center">
                        <div class="display-4 text-danger">${stats.irregular_users_count}</div>
                        <h5 class="card-title">
                            <i class="fas fa-circle me-1" style="color: #dc3545 !important;"></i>
                            不规律作息 <span class="text-muted fs-6">(${irregularRatio}%)</span>
                        </h5>
                        <p class="text-muted mb-0">活跃时间分散</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 更新图表
    updateCharts() {
        switch (this.currentDimension) {
            case 'message_volume':
                this.updateMessageVolumeCharts();
                break;
            case 'member_join_time':
                this.updateMemberJoinTimeCharts();
                break;
            case 'time_pattern':
                this.updateTimePatternCharts();
                break;
            default:
                console.log(`维度 ${this.currentDimension} 的图表功能暂未实现`);
        }
    }

    // 更新发言量图表
    updateMessageVolumeCharts() {
        const stats = this.calculateCurrentStats();

        // 更新饼图 - 发言量分布
        this.updateDistributionChart(stats);

        // 更新柱状图 - Top用户排行
        this.updateTopUsersChart(stats);
    }

    // 更新分布饼图
    updateDistributionChart(stats) {
        const ctx = document.getElementById('needsChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.distributionChart) {
            this.charts.distributionChart.destroy();
        }

        const distribution = stats.distribution;
        const labels = Object.keys(distribution);
        const data = Object.values(distribution);
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545'];

        this.charts.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '发言量分类分布',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);

                                labels.forEach((label, i) => {
                                    label.text += ` (${data[i]}人)`;
                                });

                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw}人 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 更新图表标题
        $('.card-header h5').first().html('<i class="fas fa-chart-pie"></i> 发言量分类分布');
    }

    // 更新Top用户柱状图
    updateTopUsersChart(stats) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.topUsersChart) {
            this.charts.topUsersChart.destroy();
        }

        const topUsers = stats.top_users;
        const labels = topUsers.map(u => u.nickname);
        const data = topUsers.map(u => u.count);
        const backgroundColors = topUsers.map(u => {
            switch (u.level) {
                case '主要发言人': return '#007bff';
                case '稳定发言人': return '#28a745';
                case '少量发言人': return '#ffc107';
                case '极少发言人': return '#dc3545';
                default: return '#6c757d';
            }
        });

        this.charts.topUsersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '发言数量',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 活跃用户排行',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const user = topUsers[context.dataIndex];
                                return `分类: ${user.level}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '发言数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '用户昵称'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

        // 更新图表标题
        $('.card-header h5').eq(4).html('<i class="fas fa-chart-bar"></i> Top 10 活跃用户排行');
    }

    // 更新加群时间图表
    updateMemberJoinTimeCharts() {
        const stats = this.calculateCurrentStats();

        // 更新饼图 - 新老成员分布
        this.updateMemberTypeDistributionChart(stats);

        // 更新柱状图 - 加群时间段分布
        this.updateJoinPeriodChart(stats);
    }

    // 更新成员类型分布饼图
    updateMemberTypeDistributionChart(stats) {
        const ctx = document.getElementById('memberJoinTimeChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.distributionChart) {
            this.charts.distributionChart.destroy();
        }

        const distribution = stats.distribution;
        const labels = Object.keys(distribution);
        const data = Object.values(distribution);
        const colors = ['#007bff', '#fd7e14']; // 蓝色代表老成员，橙色代表新成员

        this.charts.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '新老成员分布',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);

                                labels.forEach((label, i) => {
                                    const percentage = ((data[i] / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    label.text += ` (${data[i]}人, ${percentage}%)`;
                                });

                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw}人 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 更新图表标题
        $('.card-header h5').first().html('<i class="fas fa-chart-pie"></i> 新老成员分布');
    }

    // 更新加群时间段分布柱状图
    updateJoinPeriodChart(stats) {
        const ctx = document.getElementById('joinPeriodChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.topUsersChart) {
            this.charts.topUsersChart.destroy();
        }

        const periodDistribution = stats.period_distribution;
        const periods = ['最近7天', '8-30天', '31-60天', '60天以上'];
        const data = periods.map(period => periodDistribution[period] || 0);
        const colors = ['#28a745', '#ffc107', '#17a2b8', '#6c757d'];

        this.charts.topUsersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: periods,
                datasets: [{
                    label: '用户数量',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '加群时间段分布',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `占比: ${percentage}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '用户数量'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '加群时间段'
                        }
                    }
                }
            }
        });

        // 更新图表标题
        $('.card-header h5').eq(4).html('<i class="fas fa-chart-bar"></i> 加群时间段分布');
    }

    // 更新用户表格
    updateUserTable() {
        // 根据当前维度处理用户数据
        const processedUsers = this.processUsersForCurrentDimension();

        console.log(`${this.currentDimension} 维度处理用户数据量: ${processedUsers.length}`);

        // 彻底销毁现有表格，然后重新初始化
        this.destroyAllTables();

        // 延迟重新初始化，确保清理完成
        setTimeout(() => {
            this.initializeDataTables(processedUsers);
            console.log('表格重新初始化完成');
        }, 50);
    }

    // 彻底销毁所有表格
    destroyAllTables() {
        // 销毁桌面端表格
        if ($.fn.DataTable.isDataTable('#usersTable')) {
            $('#usersTable').DataTable().destroy();
            console.log('已销毁桌面端表格');
        }

        // 销毁移动端表格
        if ($.fn.DataTable.isDataTable('#usersTableMobile')) {
            $('#usersTableMobile').DataTable().destroy();
            console.log('已销毁移动端表格');
        }

        // 强制清理所有DataTables相关DOM元素
        $('.dataTables_wrapper').remove();
        $('.dataTables_filter').remove();
        $('.dataTables_paginate').remove();
        $('.dataTables_info').remove();
        $('.dataTables_length').remove();
        $('.dataTables_processing').remove();

        console.log('已清理所有DataTables DOM元素');
    }

    // 根据当前维度处理用户数据
    processUsersForCurrentDimension() {
        const processedUsers = this.filteredUsers.map(user => {
            const dimensions = user.dimensions || {};
            const messageVolume = dimensions.message_volume || {};

            return {
                ...user,
                currentDimensionData: this.getCurrentDimensionData(user),
                sortValue: this.getCurrentSortValue(user)
            };
        });

        // 按sortValue排序：对于加群时间维度，这会确保老成员在前，新成员在后
        return processedUsers.sort((a, b) => b.sortValue - a.sortValue);
    }

    // 获取当前维度的显示数据
    getCurrentDimensionData(user) {
        const dims = user.dimensions || {};

        switch (this.currentDimension) {
            case 'message_volume':
                const msgVol = dims.message_volume || {};
                return {
                    level: msgVol.level || '未知',
                    count: user.message_count || 0,
                    rank: msgVol.rank || 999,
                    color: this.getMessageVolumeLevelColor(msgVol.level)
                };
            case 'member_join_time':
                const memberTime = dims.member_join_time || {};
                return {
                    level: memberTime.type || '未知',
                    count: memberTime.days_since_join || 0,
                    rank: memberTime.days_since_join || 999,
                    color: this.getMemberTypeLevelColor(memberTime.type),
                    joinDate: memberTime.join_date || '未知',
                    activity: memberTime.activity_level || '未知'
                };
            case 'content_type':
                const contentType = dims.content_type || {};
                return {
                    level: contentType.type || '未知',
                    count: user.message_count || 0,
                    rank: 0, // 发言类型没有排名概念
                    color: this.getContentTypeLevelColor(contentType.type)
                };
            case 'time_pattern':
                const timePattern = dims.time_pattern || {};
                const stats = timePattern.stats || {};
                return {
                    level: timePattern.type || '未知',
                    count: user.message_count || 0,
                    rank: 0,
                    color: this.getTimePatternLevelColor(timePattern.type),
                    confidence: ((timePattern.confidence || 0) * 100).toFixed(1) + '%',
                    morningRatio: ((stats.morning_ratio || 0) * 100).toFixed(1) + '%',
                    eveningRatio: ((stats.evening_ratio || 0) * 100).toFixed(1) + '%',
                    nightRatio: ((stats.night_ratio || 0) * 100).toFixed(1) + '%'
                };
            default:
                return { level: '未知', count: 0, rank: 999, color: 'secondary' };
        }
    }

    // 获取发言量级别颜色
    getMessageVolumeLevelColor(level) {
        const colors = {
            '主要发言人': 'primary',
            '稳定发言人': 'success',
            '少量发言人': 'warning',
            '极少发言人': 'danger'
        };
        return colors[level] || 'secondary';
    }

    // 获取成员类型级别颜色
    getMemberTypeLevelColor(type) {
        const colors = {
            '老成员': 'info',
            '新成员': 'warning'
        };
        return colors[type] || 'secondary';
    }

    // 获取发言类型级别颜色
    getContentTypeLevelColor(type) {
        const colors = {
            '技术型': 'primary',
            '考试型': 'success',
            '学习方法型': 'info',
            '生活方式型': 'danger',
            '娱乐搞笑型': 'warning',
            '闲聊型': 'secondary',
            '表情包型': 'success',
            '社会技巧型': 'dark'
        };
        return colors[type] || 'secondary';
    }

    // 获取时间习惯级别颜色
    getTimePatternLevelColor(type) {
        const colors = {
            '作息规律': 'success',
            '早上型': 'info',
            '熬夜大佬': 'warning',
            '不规律作息型': 'danger',
            '规律型': 'success',
            '熬夜型': 'warning',
            '早上型': 'info'
        };
        return colors[type] || 'secondary';
    }


    // 获取当前维度的排序值
    getCurrentSortValue(user) {
        switch (this.currentDimension) {
            case 'message_volume':
                return user.message_count || 0;
            case 'member_join_time':
                // 先按成员类型排序（老成员优先），再按在群天数排序
                const memberData = user.dimensions?.member_join_time;
                if (!memberData) return -1;

                const isOldMember = memberData.type === '老成员' ? 1 : 0;
                const daysSinceJoin = memberData.days_since_join || 0;

                // 返回组合排序值：老成员(1)在前，新成员(0)在后，同类型内按天数倒序
                return isOldMember * 10000 + daysSinceJoin;
            case 'content_type':
                // 发言类型按消息数排序
                return user.message_count || 0;
            case 'time_pattern':
                // 时间习惯按消息数排序
                return user.message_count || 0;
            default:
                return 0;
        }
    }

    // 生成桌面端表格数据
    generateDesktopTableData(processedUsers) {
        return processedUsers.map(user => {
            const dimData = user.currentDimensionData;

            if (this.currentDimension === 'member_join_time') {
                return [
                    user.nickname,
                    user.main_group || '未知群组',
                    user.all_groups ? user.all_groups.length : 1,
                    `${dimData.count}天`,
                    `<span class="badge bg-${dimData.color}">${dimData.level}</span>`,
                    `<span class="badge bg-secondary">${dimData.joinDate}</span>`,
                    this.formatUserTags(user.profile_summary?.tags || []),
                    `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
                ];
            } else if (this.currentDimension === 'content_type') {
                return [
                    user.nickname,
                    user.main_group || '未知群组',
                    user.all_groups ? user.all_groups.length : 1,
                    dimData.count,
                    `<span class="badge bg-${dimData.color}">${dimData.level}</span>`,
                    this.formatUserTags(user.profile_summary?.tags || []),
                    `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
                ];
            } else if (this.currentDimension === 'time_pattern') {
                return [
                    user.nickname,
                    user.main_group || '未知群组',
                    user.all_groups ? user.all_groups.length : 1,
                    dimData.count,
                    `<span class="badge bg-${dimData.color}">${dimData.level}</span>`,
                    `<div class="time-stats">
                        <small>早: ${dimData.morningRatio}</small><br>
                        <small>晚: ${dimData.eveningRatio}</small><br>
                        <small>夜: ${dimData.nightRatio}</small>
                    </div>`,
                    `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
                ];
            } else {
                const rankDisplay = dimData.rank === 999 ? '未排名' : `#${dimData.rank}`;
                return [
                    user.nickname,
                    user.main_group || '未知群组',
                    user.all_groups ? user.all_groups.length : 1,
                    dimData.count,
                    `<span class="badge bg-${dimData.color}">${dimData.level}</span>`,
                    `<span class="badge bg-info">排名 ${rankDisplay}</span>`,
                    this.formatUserTags(user.profile_summary?.tags || []),
                    `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
                ];
            }
        });
    }

    // 生成移动端表格数据
    generateMobileTableData(processedUsers) {
        return processedUsers.map(user => {
            const dimData = user.currentDimensionData;

            const countDisplay = this.currentDimension === 'member_join_time' ? `${dimData.count}天` : dimData.count;

            return [
                `<div class="mobile-user-info">
                    <div class="mobile-user-name">${user.nickname}</div>
                    <div class="mobile-user-group">${user.main_group || '未知群组'}</div>
                    <div class="mobile-user-tags">${this.formatUserTagsMobile(user.profile_summary?.tags || [])}</div>
                </div>`,
                countDisplay,
                `<span class="badge bg-${dimData.color}" style="font-size: 0.65rem;">${this.getShortLevelName(dimData.level)}</span>`,
                `<button class="btn btn-primary btn-mobile" onclick="showUserDetailMobile('${user.user_id}')">详情</button>`
            ];
        });
    }

    // 初始化数据表格
    initializeDataTables(processedUsers) {
        // 桌面端表格数据
        const desktopTableData = this.generateDesktopTableData(processedUsers);

        // 移动端表格数据
        const mobileTableData = this.generateMobileTableData(processedUsers);

        // 初始化桌面端表格
        if ($('#usersTable').length > 0) {
            const tableConfig = {
                data: desktopTableData,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
                },
                pageLength: 10,
                responsive: true,
                paging: true,           // 强制启用分页
                lengthChange: false,    // 禁用改变每页显示条数
                searching: true,        // 启用搜索框
                ordering: true,         // 启用排序
                info: true,             // 显示信息
                autoWidth: false,       // 禁用自动宽度
                order: this.currentDimension === 'member_join_time' ? [] : [[3, 'desc']], // 加群时间维度使用预排序
                columnDefs: [
                    { targets: -1, orderable: false, searchable: false }, // 最后一列（详情按钮）不可排序
                    { targets: [2], type: 'num' } // 群组数量列
                ],
                dom: '<"top"f>rt<"bottom"ip><"clear">' // 搜索框在顶部，信息和分页在底部
            };

            // 根据不同维度调整列配置
            if (this.currentDimension === 'member_join_time') {
                // 加群时间维度：第3列是天数，第5列是日期
                tableConfig.columnDefs.push(
                    {
                        targets: [3],
                        type: 'num-fmt', // 处理"X天"格式
                        render: function(data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                return parseInt(data) || 0; // 提取数字用于排序
                            }
                            return data;
                        }
                    },
                    { targets: [5], orderable: true } // 日期列可排序
                );

                // 添加行样式区分新老成员
                tableConfig.createdRow = function(row, data, dataIndex) {
                    if (data[4] && data[4].includes('老成员')) {
                        $(row).addClass('table-info'); // 老成员行淡蓝色背景
                    } else if (data[4] && data[4].includes('新成员')) {
                        $(row).addClass('table-warning'); // 新成员行淡黄色背景
                    }
                };
            } else {
                // 其他维度：第3列是数字
                tableConfig.columnDefs.push({ targets: [3], type: 'num' });
            }

            $('#usersTable').DataTable(tableConfig);
        }

        // 初始化移动端表格
        if ($('#usersTableMobile').length > 0) {
            const mobileTableConfig = {
                data: mobileTableData,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
                },
                pageLength: 8,
                responsive: false,
                paging: true,           // 强制启用分页
                searching: true,        // 启用搜索框
                ordering: true,         // 启用排序
                autoWidth: false,       // 禁用自动宽度
                order: this.currentDimension === 'member_join_time' ? [] : [[1, 'desc']], // 加群时间维度使用预排序
                columnDefs: [
                    { targets: -1, orderable: false, searchable: false } // 最后一列（详情按钮）不可排序
                ],
                lengthChange: false,    // 移动端隐藏改变每页条数
                info: false,            // 移动端隐藏信息
                dom: '<"top"f>rt<"clear">' // 移动端：搜索框在顶部，表格在中间
            };

            // 根据不同维度调整移动端列配置
            if (this.currentDimension === 'member_join_time') {
                // 加群时间维度：第1列是天数格式
                mobileTableConfig.columnDefs.push({
                    targets: [1],
                    type: 'num-fmt',
                    render: function(data, type, row) {
                        if (type === 'sort' || type === 'type') {
                            return parseInt(data) || 0;
                        }
                        return data;
                    }
                });

                // 添加移动端行样式
                mobileTableConfig.createdRow = function(row, data, dataIndex) {
                    if (data[2] && data[2].includes('老成员')) {
                        $(row).addClass('table-info'); // 老成员行淡蓝色背景
                    } else if (data[2] && data[2].includes('新成员')) {
                        $(row).addClass('table-warning'); // 新成员行淡黄色背景
                    }
                };
            } else {
                // 其他维度：第1列是纯数字
                mobileTableConfig.columnDefs.push({ targets: [1], type: 'num' });
            }

            $('#usersTableMobile').DataTable(mobileTableConfig);
        }
    }


    // 格式化用户标签
    formatUserTags(tags) {
        if (!tags || tags.length === 0) {
            return '<span class="badge bg-secondary">未分类</span>';
        }

        return tags.slice(0, 3).map(tag =>
            `<span class="badge bg-light text-dark me-1">${tag}</span>`
        ).join('');
    }

    // 格式化移动端用户标签
    formatUserTagsMobile(tags) {
        if (!tags || tags.length === 0) {
            return '<span class="badge bg-secondary">未分类</span>';
        }

        let result = tags.slice(0, 2).map(tag =>
            `<span class="badge bg-light text-dark">${tag}</span>`
        ).join(' ');

        if (tags.length > 2) {
            result += `<span class="badge bg-secondary">+${tags.length - 2}</span>`;
        }

        return result;
    }

    // 获取发言类型描述
    getContentTypeDescription(type) {
        const descriptions = {
            '技术型': '偏向技术讨论和编程相关',
            '考试型': '关注考试、成绩等学习评估',
            '学习方法型': '分享学习技巧和方法经验',
            '生活方式型': '讨论生活习惯和健康话题',
            '娱乐搞笑型': '喜欢分享趣事和搞笑内容',
            '闲聊型': '日常随意聊天为主',
            '表情包型': '经常使用表情包交流',
            '社会技巧型': '关注人际交往和社交技能'
        };
        return descriptions[type] || '暂无描述';
    }

    // 获取简短级别名称
    getShortLevelName(level) {
        const shortNames = {
            '主要发言人': '主要',
            '稳定发言人': '稳定',
            '少量发言人': '少量',
            '极少发言人': '极少',
            '老成员': '老成员',
            '新成员': '新成员',
            '技术型': '技术',
            '考试型': '考试',
            '学习方法型': '学习',
            '生活方式型': '生活',
            '娱乐搞笑型': '娱乐',
            '闲聊型': '闲聊',
            '表情包型': '表情',
            '社会技巧型': '社交',
            '作息规律': '规律',
            '早上型': '早上',
            '熬夜大佬': '熬夜',
            '不规律作息型': '不规律',
            '规律型': '规律',
            '熬夜型': '熬夜'
        };
        return shortNames[level] || level;
    }

    // 更新时间习惯图表
    updateTimePatternCharts() {
        const stats = this.calculateCurrentStats();

        // 更新饼图 - 时间习惯分布
        this.updateTimePatternDistributionChart(stats);

        // 更新小时活跃度图表
        this.updateHourlyActivityChart(stats);
    }

    // 更新时间习惯分布饼图
    updateTimePatternDistributionChart(stats) {
        const ctx = document.getElementById('timePatternChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.distributionChart) {
            this.charts.distributionChart.destroy();
        }

        const distribution = stats.distribution;

        // 为每个时间习惯类型定义固定颜色
        const colorMap = {
            '作息规律': '#28a745',      // 绿色
            '早上型': '#17a2b8',        // 蓝色
            '熬夜大佬': '#ffc107',      // 黄色
            '不规律作息型': '#dc3545'   // 红色
        };

        // 确保所有时间习惯类型都显示在图例中，即使数据为0
        const allTypes = ['作息规律', '早上型', '熬夜大佬', '不规律作息型'];
        const labels = [];
        const data = [];
        const colors = [];

        allTypes.forEach(type => {
            const count = distribution[type] || 0;
            labels.push(type);
            data.push(count);
            colors.push(colorMap[type]);
        });

        this.charts.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '时间习惯分布',
                        font: { size: 16 }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            padding: 25,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            generateLabels: function(chart) {
                                // 强制显示所有时间习惯类型的图例
                                const allTypes = ['作息规律', '早上型', '熬夜大佬', '不规律作息型'];
                                const colorMap = {
                                    '作息规律': '#28a745',
                                    '早上型': '#17a2b8',
                                    '熬夜大佬': '#ffc107',
                                    '不规律作息型': '#dc3545'
                                };
                                const descriptions = {
                                    '作息规律': '8-23点发言占比>80%',
                                    '早上型': '6-10点发言占比>40%',
                                    '熬夜大佬': '0-6点发言占比>30%',
                                    '不规律作息型': '活跃时间分散'
                                };

                                return allTypes.map((type, index) => {
                                    const count = chart.data.datasets[0].data[index] || 0;
                                    const description = descriptions[type];

                                    return {
                                        text: `${type} (${count}人) - ${description}`,
                                        fillStyle: colorMap[type],
                                        strokeStyle: colorMap[type],
                                        lineWidth: 2,
                                        hidden: false,
                                        pointStyle: 'circle'
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const dataset = context.dataset.data;
                                const total = dataset.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                const labelText = context.label;

                                // 添加时间习惯的详细说明
                                const descriptions = {
                                    '作息规律': '8-23点发言占比>80%',
                                    '早上型': '6-10点发言占比>40%',
                                    '熬夜大佬': '0-6点发言占比>30%',
                                    '不规律作息型': '活跃时间分散'
                                };

                                const description = descriptions[labelText] || '';
                                return [
                                    `${labelText}: ${context.parsed}人 (${percentage}%)`,
                                    `标准: ${description}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // 更新小时活跃度折线图
    updateHourlyActivityChart(stats) {
        const ctx = document.getElementById('hourlyActivityChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.topUsersChart) {
            this.charts.topUsersChart.destroy();
        }

        const hourDistribution = stats.hour_distribution;

        // 创建24小时的数据
        const hours = Array.from({length: 24}, (_, i) => i);
        const activityData = hours.map(hour => hourDistribution[hour.toString()] || 0);

        this.charts.topUsersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: '消息数量',
                    data: activityData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '24小时活跃度分布',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '消息数量'
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                }
            }
        });
    }
}

// 导出数据功能
function exportCurrentView() {
    if (window.dimensionController && window.dimensionController.analyticsData) {
        const data = {
            dimension: window.dimensionController.currentDimension,
            group_filter: window.dimensionController.currentGroup,
            filtered_users: window.dimensionController.filteredUsers,
            stats: window.dimensionController.calculateCurrentStats(),
            export_time: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `用户画像_${data.dimension}_${new Date().toISOString().slice(0,10)}.json`;
        link.click();

        console.log('数据导出完成');
    } else {
        alert('暂无数据可导出');
    }
}