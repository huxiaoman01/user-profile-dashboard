// 小小纺用户画像分析平台 - 主要逻辑

let analyticsData = null;
let dimensionController = null;

// 页面加载完成后执行
$(document).ready(function() {
    loadAnalyticsData();
    initializeModalFix();
});

// 初始化维度控制器
function initializeDimensionController() {
    try {
        if (!dimensionController) {
            console.log('创建新的维度控制器实例...');
            dimensionController = new DimensionController();
            window.dimensionController = dimensionController; // 全局访问
            console.log('维度控制器实例创建成功');
        }
    } catch (error) {
        console.error('维度控制器初始化失败:', error);
        throw error;
    }
}

// 初始化模态框跳跃修复 - 彻底阻止Bootstrap默认行为
function initializeModalFix() {
    const userModal = document.getElementById('userModal');
    if (userModal) {
        // 创建我们自己的模态框实例，覆盖Bootstrap默认配置
        const modalInstance = new bootstrap.Modal(userModal, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        
        // 完全阻止Bootstrap的默认滚动处理
        const originalShow = modalInstance.show;
        const originalHide = modalInstance.hide;
        
        modalInstance.show = function() {
            // 保存当前body样式
            const currentPadding = document.body.style.paddingRight;
            const currentOverflow = document.body.style.overflow;
            
            // 调用原始方法
            originalShow.call(this);
            
            // 立即恢复body样式
            document.body.style.paddingRight = currentPadding;
            document.body.style.overflow = 'auto';
            document.body.classList.remove('modal-open');
            
            // 强制重写
            setTimeout(() => {
                document.body.style.paddingRight = '0px';
                document.body.style.overflow = 'auto';
                document.body.style.marginRight = '0px';
            }, 0);
        };
        
        modalInstance.hide = function() {
            originalHide.call(this);
            // 确保隐藏后样式正确
            setTimeout(() => {
                document.body.style.paddingRight = '0px';
                document.body.style.overflow = 'auto';
                document.body.style.marginRight = '0px';
                document.body.classList.remove('modal-open');
            }, 0);
        };
        
        // 监听所有模态框相关事件，强制重写样式
        ['show.bs.modal', 'shown.bs.modal', 'hide.bs.modal', 'hidden.bs.modal'].forEach(eventName => {
            userModal.addEventListener(eventName, function() {
                // 使用requestAnimationFrame确保在浏览器重绘后执行
                requestAnimationFrame(() => {
                    document.body.style.paddingRight = '0px';
                    document.body.style.overflow = 'auto';
                    document.body.style.marginRight = '0px';
                });
            });
        });
    }
}

// 加载分析数据
function loadAnalyticsData() {
    console.log('开始加载分析数据...');

    $.ajax({
        url: 'data/analytics.json',
        dataType: 'json',
        cache: false,
        timeout: 30000,
        beforeSend: function(xhr) {
            xhr.overrideMimeType('application/json; charset=utf-8');
        }
    })
    .done(function(data) {
        console.log('数据加载成功:', data);
        analyticsData = data;
        initializeDashboard();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error('数据加载失败:', {
            status: jqXHR.status,
            statusText: textStatus,
            errorThrown: errorThrown,
            responseText: jqXHR.responseText ? jqXHR.responseText.substring(0, 200) : 'null'
        });
        showError('数据加载失败，请确保已运行数据处理脚本生成analytics.json文件<br>错误详情: ' + textStatus + ' - ' + errorThrown);
    });
}

// 初始化仪表板
function initializeDashboard() {
    if (!analyticsData) {
        console.error('analyticsData is null or undefined');
        return;
    }

    console.log('开始初始化仪表板...', analyticsData);

    try {
        // 更新统计数据
        updateStats();
        console.log('统计数据更新完成');

        // 初始化维度控制器
        initializeDimensionController();
        console.log('维度控制器初始化完成');

        // 设置维度控制器数据
        if (dimensionController) {
            dimensionController.setData(analyticsData);
            console.log('维度控制器数据设置完成');
        } else {
            console.error('dimensionController is null');
        }

        // 生成词云
        generateWordCloud();
        console.log('词云生成完成');

        console.log('仪表板初始化完成');
    } catch (error) {
        console.error('仪表板初始化失败:', error);
        showError('仪表板初始化失败: ' + error.message);
    }
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
        user.all_groups ? user.all_groups.length : 1,
        user.message_count || 0,
        `<span class="badge bg-${getCategoryColor(user.dimensions?.message_volume?.level)}">${user.dimensions?.message_volume?.level || '未知'}</span>`,
        `<span class="badge bg-info">活跃度 #${user.dimensions?.message_volume?.rank || '?'}</span>`,
        formatUserTags(user.profile_summary?.tags || []),
        `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
    ]);
    
    // 移动端表格数据（简化版）
    const mobileTableData = users.map(user => [
        `<div class="mobile-user-info">
            <div class="mobile-user-name">${user.nickname}</div>
            <div class="mobile-user-group">${user.main_group || '未知群组'}</div>
            <div class="mobile-user-tags">${formatUserTagsMobile(user.profile_summary?.tags || [])}</div>
        </div>`,
        user.message_count || 0,
        `<span class="badge bg-${getCategoryColor(user.dimensions?.message_volume?.level)}" style="font-size: 0.65rem;">${getShortUserCategory(user.dimensions?.message_volume?.level)}</span>`,
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
        '主要发言人': 'primary',
        '稳定发言人': 'success',
        '少量发言人': 'warning',
        '极少发言人': 'danger',
        '高价值用户': 'success',
        '潜在用户': 'info',
        '新用户': 'warning',
        '沉默用户': 'secondary',
        '老成员': 'info',
        '新成员': 'warning'
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
function formatUserTags(tags) {
    if (!tags || tags.length === 0) {
        return '<span class="badge bg-secondary">未分类</span>';
    }

    return tags.slice(0, 3).map(tag =>
        `<span class="badge bg-light text-dark me-1">${tag}</span>`
    ).join('');
}

// 格式化移动端用户标签（简化版）
function formatUserTagsMobile(tags) {
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

// 获取简短的用户类型名称
function getShortUserCategory(category) {
    const shortNames = {
        '主要发言人': '主要',
        '稳定发言人': '稳定',
        '少量发言人': '少量',
        '极少发言人': '极少',
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
    const dims = user.dimensions || {};
    const msgVol = dims.message_volume || {};
    const contentType = dims.content_type || {};
    const timePattern = dims.time_pattern || {};
    const socialBehavior = dims.social_behavior || {};
    const sentiment = dims.sentiment || {};
    const profileSummary = user.profile_summary || {};

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
                消息数: ${user.message_count || 0}条 |
                平均消息长度: ${user.avg_message_length ? user.avg_message_length.toFixed(1) : 0}字符 |
                参与群数: ${user.all_groups ? user.all_groups.length : 1}个
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">发言量分类</div>
            <div class="user-info-content">
                <span class="badge bg-${getCategoryColor(msgVol.level)}">${msgVol.level || '未知'}</span>
                <small class="text-muted d-block mt-1">排名: #${msgVol.rank || '?'}</small>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">发言类型</div>
            <div class="user-info-content">
                <span class="badge bg-info">${contentType.type || '未知'}</span>
                <small class="text-muted d-block mt-1">置信度: ${((contentType.confidence || 0) * 100).toFixed(1)}%</small>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">时间习惯</div>
            <div class="user-info-content">
                <span class="badge bg-success">${timePattern.type || '未知'}</span>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">社交行为</div>
            <div class="user-info-content">
                <span class="badge bg-warning">${socialBehavior.type || '未知'}</span>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">情感倾向</div>
            <div class="user-info-content">
                <span class="badge bg-primary">${sentiment.type || '未知'}</span>
                <small class="text-muted d-block mt-1">评分: ${((sentiment.score || 0.5) * 100).toFixed(0)}%</small>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">加群时间</div>
            <div class="user-info-content">
                <span class="badge bg-${getCategoryColor(dims.member_join_time?.type)}">${dims.member_join_time?.type || '未知'}</span>
                <small class="text-muted d-block mt-1">
                    加群日期: ${dims.member_join_time?.join_date || '未知'} |
                    在群天数: ${dims.member_join_time?.days_since_join || 0}天 |
                    活跃度: ${dims.member_join_time?.activity_level || '未知'}
                </small>
            </div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">用户标签</div>
            <div class="user-info-content">${formatUserTags(profileSummary.tags || [])}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">用户画像</div>
            <div class="user-info-content">${profileSummary.description || '暂无详细描述'}</div>
        </div>
        <div class="user-info-item">
            <div class="user-info-label">活跃评分</div>
            <div class="user-info-content">
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${(profileSummary.active_score || 0) * 100}%" aria-valuenow="${(profileSummary.active_score || 0) * 100}" aria-valuemin="0" aria-valuemax="100">
                        ${((profileSummary.active_score || 0) * 100).toFixed(0)}%
                    </div>
                </div>
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