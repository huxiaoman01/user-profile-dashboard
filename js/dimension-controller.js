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

        // 刷新视图
        this.refreshCurrentView();
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

        // 更新用户表格
        this.updateUserTable();
    }

    // 更新统计卡片
    updateStatCards() {
        const stats = this.calculateCurrentStats();
        const cardsHtml = this.generateStatCards(stats);
        $('#dynamicStats').html(cardsHtml);
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

    // 生成统计卡片HTML
    generateStatCards(stats) {
        if (!stats.type) return '';

        switch (stats.type) {
            case 'message_volume':
                return this.generateMessageVolumeCards(stats);
            case 'member_join_time':
                return this.generateMemberJoinTimeCards(stats);
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
            <div class="col-12 mt-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-lightbulb text-warning"></i> 数据洞察
                        </h6>
                        <ul class="mb-0">
                            ${stats.insights.map(insight => `<li>${insight}</li>`).join('')}
                        </ul>
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
            <div class="col-12 mt-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-lightbulb text-warning"></i> 加群时间分析洞察
                        </h6>
                        <ul class="mb-0">
                            ${stats.insights.map(insight => `<li>${insight}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-12 mt-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-chart-bar text-info"></i> 活跃度对比分析
                        </h6>
                        <div class="row text-center">
                            <div class="col-md-4">
                                <div class="border rounded p-3 mb-2">
                                    <div class="h5 text-info">${stats.old_member_avg_messages}</div>
                                    <div class="small text-muted">老成员平均发言</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="border rounded p-3 mb-2">
                                    <div class="h5 text-warning">${stats.new_member_avg_messages}</div>
                                    <div class="small text-muted">新成员平均发言</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="border rounded p-3 mb-2">
                                    <div class="h5 text-success">
                                        ${stats.old_member_avg_messages > 0 ? (stats.new_member_avg_messages / stats.old_member_avg_messages * 100).toFixed(0) : 0}%
                                    </div>
                                    <div class="small text-muted">新成员活跃度比例</div>
                                </div>
                            </div>
                        </div>
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
        const ctx = document.getElementById('needsChart');
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
        const ctx = document.getElementById('trendChart');
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
        // 如果DataTable已存在，先销毁
        if ($.fn.DataTable.isDataTable('#usersTable')) {
            $('#usersTable').DataTable().destroy();
            $('#usersTable').empty(); // 清空表格内容
        }
        if ($.fn.DataTable.isDataTable('#usersTableMobile')) {
            $('#usersTableMobile').DataTable().destroy();
            $('#usersTableMobile').empty(); // 清空表格内容
        }

        // 根据当前维度处理用户数据
        const processedUsers = this.processUsersForCurrentDimension();

        console.log(`${this.currentDimension} 维度处理用户数量: ${processedUsers.length}`);

        // 重新初始化表格
        this.initializeDataTables(processedUsers);
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
            default:
                return 0;
        }
    }

    // 初始化数据表格
    initializeDataTables(processedUsers) {
        // 桌面端表格
        const desktopTableData = processedUsers.map(user => {
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
            } else {
                return [
                    user.nickname,
                    user.main_group || '未知群组',
                    user.all_groups ? user.all_groups.length : 1,
                    dimData.count,
                    `<span class="badge bg-${dimData.color}">${dimData.level}</span>`,
                    `<span class="badge bg-info">排名 #${dimData.rank}</span>`,
                    this.formatUserTags(user.profile_summary?.tags || []),
                    `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
                ];
            }
        });

        // 移动端表格
        const mobileTableData = processedUsers.map(user => {
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
                lengthChange: true,     // 允许改变每页显示条数
                searching: true,        // 启用搜索
                ordering: true,         // 启用排序
                info: true,             // 显示信息
                autoWidth: false,       // 禁用自动宽度
                order: this.currentDimension === 'member_join_time' ? [] : [[3, 'desc']], // 加群时间维度使用预排序
                columnDefs: [
                    { targets: [7], orderable: false, searchable: false },
                    { targets: [2], type: 'num' } // 群组数量列
                ]
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
                searching: true,        // 启用搜索
                ordering: true,         // 启用排序
                autoWidth: false,       // 禁用自动宽度
                order: this.currentDimension === 'member_join_time' ? [] : [[1, 'desc']], // 加群时间维度使用预排序
                columnDefs: [
                    { targets: [3], orderable: false, searchable: false }
                ],
                lengthChange: false,    // 移动端隐藏改变每页条数
                info: false             // 移动端隐藏信息
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

    // 获取简短级别名称
    getShortLevelName(level) {
        const shortNames = {
            '主要发言人': '主要',
            '稳定发言人': '稳定',
            '少量发言人': '少量',
            '极少发言人': '极少',
            '老成员': '老成员',
            '新成员': '新成员'
        };
        return shortNames[level] || level;
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