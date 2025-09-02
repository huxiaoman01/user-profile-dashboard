// 小小纺用户画像分析平台 - 主要逻辑

let analyticsData = null;

// 页面加载完成后执行
$(document).ready(function() {
    loadAnalyticsData();
});

// 加载分析数据
function loadAnalyticsData() {
    $.getJSON('data/analytics.json')
        .done(function(data) {
            analyticsData = data;
            initializeDashboard();
        })
        .fail(function() {
            showError('数据加载失败，请确保已运行数据处理脚本生成analytics.json文件');
        });
}

// 初始化仪表板
function initializeDashboard() {
    if (!analyticsData) return;
    
    // 更新统计数据
    updateStats();
    
    // 初始化用户表格
    initializeUsersTable();
    
    // 初始化图表
    initializeCharts();
    
    // 生成词云
    generateWordCloud();
}

// 更新统计数据
function updateStats() {
    const stats = analyticsData.stats;
    
    $('#totalUsers').text(stats.total_users.toLocaleString());
    $('#totalMessages').text(stats.total_messages.toLocaleString());
    $('#totalGroups').text(stats.total_groups);
    $('#lastUpdate').text(`数据更新时间: ${stats.update_time}`);
}

// 初始化用户表格
function initializeUsersTable() {
    const users = analyticsData.users;
    
    // 桌面端表格数据
    const tableData = users.map(user => [
        user.nickname,
        user.main_group || '未知群组',
        user.group_count || 1,
        user.message_count || 0,
        `<span class="badge bg-${getCategoryColor(user.user_category)}">${user.user_category}</span>`,
        `<span class="badge bg-${getStatusColor(user.portrait_status)}">${user.portrait_status}</span>`,
        formatUserTags(user.keywords),
        `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
    ]);
    
    // 移动端表格数据（简化版）
    const mobileTableData = users.map(user => [
        `<div class="mobile-user-info">
            <div class="mobile-user-name">${user.nickname}</div>
            <div class="mobile-user-group">${user.main_group || '未知群组'}</div>
            <div class="mobile-user-tags">${formatUserTagsMobile(user.keywords)}</div>
        </div>`,
        user.message_count || 0,
        `<span class="badge bg-${getCategoryColor(user.user_category)}" style="font-size: 0.65rem;">${getShortUserCategory(user.user_category)}</span>`,
        `<button class="btn btn-primary btn-mobile" onclick="showUserDetailMobile('${user.user_id}')">详情</button>`
    ]);
    
    // 初始化桌面端表格
    if ($('#usersTable').length > 0) {
        $('#usersTable').DataTable({
            data: tableData,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
            },
            pageLength: 10,
            responsive: true,
            order: [[3, 'desc']], // 按消息数排序
            columnDefs: [
                { targets: [7], orderable: false, searchable: false },
                { targets: [2, 3], type: 'num' }
            ]
        });
    }
    
    // 初始化移动端表格
    if ($('#usersTableMobile').length > 0) {
        $('#usersTableMobile').DataTable({
            data: mobileTableData,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
            },
            pageLength: 8,
            responsive: false,
            order: [[1, 'desc']], // 按消息数排序
            columnDefs: [
                { targets: [3], orderable: false, searchable: false },
                { targets: [1], type: 'num' }
            ],
            lengthChange: false,
            info: false
        });
    }
}

// 获取用户类型颜色
function getCategoryColor(category) {
    const colors = {
        '高价值用户': 'success',
        '潜在用户': 'info',
        '新用户': 'warning',
        '沉默用户': 'secondary'
    };
    return colors[category] || 'secondary';
}

// 获取画像状态颜色
function getStatusColor(status) {
    const colors = {
        '完整': 'success',
        '部分': 'warning',
        '数据不足': 'danger',
        '待分析': 'info'
    };
    return colors[status] || 'secondary';
}

// 格式化用户标签
function formatUserTags(keywords) {
    if (!keywords || keywords.length === 0) {
        return '<span class="user-tag">未分类</span>';
    }
    
    return keywords.map(tag => 
        `<span class="user-tag tag-${tag}">${tag}</span>`
    ).join(' ');
}

// 格式化移动端用户标签（简化版）
function formatUserTagsMobile(keywords) {
    if (!keywords || keywords.length === 0) {
        return '<span class="user-tag">未分类</span>';
    }
    
    // 移动端只显示前2个标签
    const limitedTags = keywords.slice(0, 2);
    let result = limitedTags.map(tag => 
        `<span class="user-tag tag-${tag}">${tag}</span>`
    ).join(' ');
    
    if (keywords.length > 2) {
        result += `<span class="user-tag">+${keywords.length - 2}</span>`;
    }
    
    return result;
}

// 获取简短的用户类型名称
function getShortUserCategory(category) {
    const shortNames = {
        '高价值用户': '高价值',
        '潜在用户': '潜在',
        '新用户': '新用户',
        '沉默用户': '沉默'
    };
    return shortNames[category] || category;
}

// 格式化详细画像文本，支持展开/收起和tooltip
function formatImpressionText(impression, portraitReason, userId) {
    if (!impression || impression.trim() === '') {
        return `暂无详细画像信息，原因: ${portraitReason}`;
    }
    
    const maxLength = 300;
    const impressionId = `impression-${userId}`;
    
    if (impression.length <= maxLength) {
        return impression;
    }
    
    // 智能截断：尽量在句号、逗号或空格处截断
    let cutPosition = maxLength;
    const smartCutChars = ['。', '，', '、', ' ', '；', '！', '？'];
    
    for (let i = maxLength - 50; i < maxLength; i++) {
        if (smartCutChars.includes(impression[i])) {
            cutPosition = i + 1;
        }
    }
    
    const shortText = impression.substring(0, cutPosition).trim();
    const fullText = impression;
    
    return `
        <div id="${impressionId}">
            <span class="impression-short" 
                  data-bs-toggle="tooltip" 
                  data-bs-placement="top" 
                  title="${fullText.replace(/"/g, '&quot;')}">${shortText}...</span>
            <span class="impression-full" style="display: none;">${fullText}</span>
            <br>
            <button class="btn btn-link btn-sm p-0 mt-1 expand-btn" 
                    onclick="toggleImpression('${impressionId}')">
                <i class="fas fa-chevron-down me-1"></i>展开
            </button>
        </div>
    `;
}

// 切换详细画像的展开/收起状态
function toggleImpression(impressionId) {
    const container = document.getElementById(impressionId);
    const shortSpan = container.querySelector('.impression-short');
    const fullSpan = container.querySelector('.impression-full');
    const expandBtn = container.querySelector('.expand-btn');
    
    if (shortSpan.style.display === 'none') {
        // 当前显示完整文本，切换到简短文本
        shortSpan.style.display = 'inline';
        fullSpan.style.display = 'none';
        expandBtn.innerHTML = '<i class="fas fa-chevron-down me-1"></i>展开';
        
        // 重新初始化tooltip
        const tooltip = bootstrap.Tooltip.getOrCreateInstance(shortSpan);
        tooltip.enable();
    } else {
        // 当前显示简短文本，切换到完整文本
        shortSpan.style.display = 'none';
        fullSpan.style.display = 'inline';
        expandBtn.innerHTML = '<i class="fas fa-chevron-up me-1"></i>收起';
        
        // 禁用tooltip（因为现在显示的是完整文本）
        const tooltip = bootstrap.Tooltip.getInstance(shortSpan);
        if (tooltip) {
            tooltip.disable();
        }
    }
}

// 显示用户详情（桌面端）
function showUserDetail(userId) {
    const user = analyticsData.users.find(u => u.user_id === userId);
    if (!user) return;
    
    const detailHtml = generateUserDetailHtml(user, userId);
    $('#userDetail').html(detailHtml);
    
    // 同时在模态框中显示
    $('#modalUserDetail').html(detailHtml);
    
    // 初始化新添加的tooltip
    initializeTooltips();
}

// 显示用户详情（移动端，使用模态框）
function showUserDetailMobile(userId) {
    const user = analyticsData.users.find(u => u.user_id === userId);
    if (!user) return;
    
    const detailHtml = generateUserDetailHtml(user, userId);
    $('#modalUserDetail').html(detailHtml);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
    
    // 初始化新添加的tooltip
    initializeTooltips();
}

// 生成用户详情HTML
function generateUserDetailHtml(user, userId) {
    return `
        <div class="user-info-item">
            <div class="user-info-label">用户昵称</div>
            <div class="user-info-content">${user.nickname}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">主要群组</div>
            <div class="user-info-content">${user.main_group}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">参与群组</div>
            <div class="user-info-content">${user.all_groups ? user.all_groups.join(', ') : user.main_group}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">用户统计</div>
            <div class="user-info-content">
                消息数: ${user.message_count}条 | 
                平均消息长度: ${user.avg_message_length ? user.avg_message_length.toFixed(1) : 0}字符 | 
                参与群数: ${user.group_count}个
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">用户分类</div>
            <div class="user-info-content">
                <span class="badge bg-${getCategoryColor(user.user_category)}">${user.user_category}</span>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">画像状态</div>
            <div class="user-info-content">
                <span class="badge bg-${getStatusColor(user.portrait_status)}">${user.portrait_status}</span>
                <small class="text-muted d-block mt-1">${user.portrait_reason}</small>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">兴趣标签</div>
            <div class="user-info-content">${formatUserTags(user.keywords)}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">详细画像</div>
            <div class="user-info-content">
                ${formatImpressionText(user.impression, user.portrait_reason, userId)}
            </div>
        </div>
    `;
}

// 初始化所有tooltip
function initializeTooltips() {
    // 销毁已有的tooltip实例以避免重复
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => {
        const existingTooltip = bootstrap.Tooltip.getInstance(element);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
    });
    
    // 重新初始化所有tooltip
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

// 生成词云（HTML+CSS实现）
function generateWordCloud() {
    const wordCloudData = analyticsData.keyword_cloud;
    
    if (!wordCloudData || wordCloudData.length === 0) {
        $('#wordCloudContainer').html('<p class="text-muted">暂无词云数据</p>');
        return;
    }
    
    // 计算最大权重用于缩放
    const maxWeight = Math.max(...wordCloudData.map(item => item.weight));
    
    let wordCloudHtml = '<div class="word-cloud-wrapper">';
    
    wordCloudData.forEach((item, index) => {
        // 根据屏幕大小调整字体计算
        const isMobile = window.innerWidth <= 768;
        const baseFontSize = isMobile ? 10 : 12;
        const maxScaleFactor = isMobile ? 24 : 32;
        
        const fontSize = Math.max(baseFontSize, (item.weight / maxWeight) * maxScaleFactor + baseFontSize);
        const colors = ['#007bff', '#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6610f2', '#fd7e14', '#20c997'];
        const color = colors[index % colors.length];
        
        wordCloudHtml += `
            <span class="word-cloud-item" 
                  style="font-size: ${fontSize}px; color: ${color}; margin: 5px;"
                  title="${item.text}: ${item.weight}次">
                ${item.text}
            </span>
        `;
    });
    
    wordCloudHtml += '</div>';
    $('#wordCloudContainer').html(wordCloudHtml);
}

// 显示错误信息
function showError(message) {
    const errorHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('body').prepend(errorHtml);
}

// 格式化数字
function formatNumber(num) {
    return num.toLocaleString();
}

// 获取随机颜色
function getRandomColor() {
    const colors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', 
        '#dc3545', '#6610f2', '#fd7e14', '#20c997'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 导出数据功能（可选）
function exportData() {
    if (!analyticsData) {
        alert('数据未加载完成');
        return;
    }
    
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'analytics_data.json';
    link.click();
}

// 刷新数据
function refreshData() {
    location.reload();
}