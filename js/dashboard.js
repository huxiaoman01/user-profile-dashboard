// 小小纺用户画像分析平台 - 主要逻辑

console.log('🚀 dashboard.js 文件开始加载...');

let analyticsData = null;
let dimensionController = null;

// 立即创建一个全局测试函数
window.jsLoadTest = function() {
    console.log('✅ JavaScript 文件加载成功');
    return 'dashboard.js 已加载';
};

// 全局侧边栏切换函数
window.toggleSidebar = function() {
    console.log('🔄 toggleSidebar 被调用');

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('toggleIcon');

    // 详细的元素检查
    console.log('🔍 元素检查:', {
        sidebar: sidebar ? '找到' : '未找到',
        mainContent: mainContent ? '找到' : '未找到',
        toggleIcon: toggleIcon ? '找到' : '未找到',
        toggleIconClass: toggleIcon ? toggleIcon.className : 'N/A'
    });

    if (!sidebar || !mainContent) {
        console.error('❌ 找不到侧边栏或主内容元素');
        return;
    }

    // 获取当前状态
    const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
    const currentSidebarWidth = sidebar.style.width;
    const currentMarginLeft = mainContent.style.marginLeft;

    console.log('📄 当前详细状态:', {
        isCollapsed: isCurrentlyCollapsed,
        sidebarClasses: Array.from(sidebar.classList),
        mainContentClasses: Array.from(mainContent.classList),
        currentSidebarWidth: currentSidebarWidth,
        currentMarginLeft: currentMarginLeft,
        toggleIconCurrentClass: toggleIcon ? toggleIcon.className : 'N/A'
    });

    // 切换类
    if (isCurrentlyCollapsed) {
        // 当前是收缩状态，需要展开
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
        sidebar.style.width = '250px';
        mainContent.style.marginLeft = '250px';

        if (toggleIcon) {
            const oldClass = toggleIcon.className;
            toggleIcon.className = 'fas fa-chevron-left';
            console.log('🔄 图标更新 (展开):', {
                旧图标: oldClass,
                新图标: toggleIcon.className,
                更新成功: toggleIcon.className === 'fas fa-chevron-left'
            });
        } else {
            console.error('❌ toggleIcon 元素不存在，无法更新图标');
        }
        console.log('🔓 展开侧边栏完成');
    } else {
        // 当前是展开状态，需要收缩
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
        sidebar.style.width = '60px';
        mainContent.style.marginLeft = '60px';

        if (toggleIcon) {
            const oldClass = toggleIcon.className;
            toggleIcon.className = 'fas fa-chevron-right';
            console.log('🔄 图标更新 (收缩):', {
                旧图标: oldClass,
                新图标: toggleIcon.className,
                更新成功: toggleIcon.className === 'fas fa-chevron-right'
            });
        } else {
            console.error('❌ toggleIcon 元素不存在，无法更新图标');
        }
        console.log('🔒 收缩侧边栏完成');
    }

    console.log('📊 切换后状态:', {
        collapsed: sidebar.classList.contains('collapsed'),
        expanded: mainContent.classList.contains('expanded'),
        sidebarWidth: sidebar.style.width,
        mainContentMarginLeft: mainContent.style.marginLeft
    });

    return true;
};

// 页面加载完成后执行
$(document).ready(function() {
    console.log('📄 DOM 加载完成，开始执行初始化...');

    loadAnalyticsData();
    initializeModalFix();
    initializeSidebar();

    console.log('🎯 所有初始化函数已调用');
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

// 全局显示用户详情函数（供按钮点击使用）
window.showUserDetail = function(userId) {
    console.log('点击查看详情, userId:', userId);

    // 检查数据是否加载
    if (!analyticsData) {
        console.error('analyticsData 未加载');
        alert('数据未加载完成，请稍后再试');
        return;
    }

    if (!analyticsData.users) {
        console.error('analyticsData.users 不存在');
        alert('用户数据不存在');
        return;
    }

    const user = analyticsData.users.find(u => u.user_id === userId);
    if (!user) {
        console.error('找不到用户:', userId);
        alert(`找不到用户 ID: ${userId}`);
        return;
    }

    console.log('找到用户:', user);

    try {
        const detailHtml = generateUserDetailHtml(user, userId);
        $('#modalUserDetail').html(detailHtml);

        // 检查模态框元素是否存在
        const modalElement = document.getElementById('userModal');
        if (!modalElement) {
            console.error('模态框元素不存在');
            alert('模态框初始化失败');
            return;
        }

        // 提高用户详情模态框的z-index，确保显示在分类模态框之上
        modalElement.style.zIndex = '1060';

        // 显示模态框
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static', // 防止点击背景关闭
            keyboard: true
        });
        modal.show();

        console.log('模态框已显示');

        // 初始化新添加的tooltip
        initializeTooltips();

        // 监听模态框关闭事件，关闭时恢复z-index
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.style.zIndex = '';
        }, { once: true });

    } catch (error) {
        console.error('显示用户详情失败:', error);
        alert('显示用户详情失败: ' + error.message);
    }
};

// 移动端显示用户详情
window.showUserDetailMobile = function(userId) {
    window.showUserDetail(userId); // 使用相同的逻辑
};

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

// 初始化侧边栏伸缩功能
function initializeSidebar() {
    console.log('🔧 开始初始化侧边栏功能...');

    // 立即创建测试函数，确保它存在
    window.testSidebarToggle = function() {
        console.log('🧪 手动测试函数被调用');
        return 'testSidebarToggle 函数已加载';
    };

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const toggleIcon = document.getElementById('toggleIcon');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');

    console.log('侧边栏元素检查:', {
        sidebar: sidebar ? '找到' : '未找到',
        mainContent: mainContent ? '找到' : '未找到',
        sidebarToggle: sidebarToggle ? '找到' : '未找到',
        toggleIcon: toggleIcon ? '找到' : '未找到'
    });

    // 注释掉旧的事件监听器，避免与内联onclick冲突
    console.log('✅ 侧边栏初始化完成，使用内联onclick事件处理');

    // 旧的测试函数已不需要，由window.toggleSidebar()替代
    console.log('🎯 侧边栏功能已就绪');

    // 移动端菜单切换
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');

            // 显示/隐藏遮罩层
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);

                // 点击遮罩层关闭侧边栏
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('show');
                    overlay.classList.remove('show');
                });
            }

            overlay.classList.toggle('show');
        });
    }

    // 窗口尺寸改变时的响应式处理
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            // 移动端：隐藏侧边栏
            sidebar.classList.remove('show');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        } else {
            // 桌面端：清除移动端类
            sidebar.classList.remove('show');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
    });
}

// 加载分析数据
function loadAnalyticsData() {
    console.log('开始加载分析数据...');

    $.ajax({
        url: 'data/analytics_with_content_types.json',
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
        showError('数据加载失败，请确保已运行数据处理脚本生成analytics_with_content_types.json文件<br>错误详情: ' + textStatus + ' - ' + errorThrown);
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

        // 删除词云功能按需求

        // 如果当前维度是发言类型，初始化发言类型分析
        if (dimensionController && dimensionController.currentDimension === 'content_type') {
            setTimeout(() => {
                initializeContentTypeAnalysis();
            }, 500);
        }

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

// DataTables初始化已移至dimension-controller.js统一管理
// 避免重复初始化导致UI元素重复的问题

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

// 删除词云功能（按用户需求）

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

// ===== 发言类型分析相关功能 =====

// 初始化发言类型分析
function initializeContentTypeAnalysis() {
    if (!analyticsData || !analyticsData.users) {
        console.error('数据未加载，无法初始化发言类型分析');
        return;
    }

    console.log('初始化发言类型分析...');

    try {
        generateContentTypeStats();
        createContentTypeCharts();
        initializeContentTypeTable();
        initializeContentTypeFilter();
        initializeContentTypeExport();

        console.log('发言类型分析初始化完成');
    } catch (error) {
        console.error('发言类型分析初始化失败:', error);
    }
}

// 生成发言类型统计卡片
function generateContentTypeStats() {
    const contentTypeStats = {};
    const totalUsers = analyticsData.users.length;

    // 统计各类型数量
    analyticsData.users.forEach(user => {
        const contentType = user.dimensions?.content_type?.type || '未知';
        contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    });

    // 类型图标和颜色映射
    const typeConfig = {
        '技术型': { icon: 'fas fa-code', color: 'primary' },
        '考试型': { icon: 'fas fa-graduation-cap', color: 'success' },
        '学习方法型': { icon: 'fas fa-lightbulb', color: 'info' },
        '生活方式型': { icon: 'fas fa-heart', color: 'danger' },
        '娱乐搞笑型': { icon: 'fas fa-laugh', color: 'warning' },
        '闲聊型': { icon: 'fas fa-comments', color: 'secondary' },
        '表情包型': { icon: 'fas fa-smile', color: 'success' },
        '社会技巧型': { icon: 'fas fa-users', color: 'dark' },
        '未知': { icon: 'fas fa-question', color: 'muted' }
    };

    const statsContainer = $('#contentTypeStats');
    statsContainer.empty();

    // 生成统计卡片
    Object.entries(contentTypeStats).forEach(([type, count]) => {
        const config = typeConfig[type] || typeConfig['未知'];
        const percentage = ((count / totalUsers) * 100).toFixed(1);

        const cardHtml = `
            <div class="col-xl-3 col-lg-4 col-md-6 mb-3">
                <div class="card bg-light border-${config.color} h-100">
                    <div class="card-body text-center">
                        <div class="d-flex align-items-center justify-content-center mb-2">
                            <i class="${config.icon} text-${config.color}" style="font-size: 2rem;"></i>
                        </div>
                        <h5 class="card-title">${type}</h5>
                        <h3 class="text-${config.color}">${count}</h3>
                        <p class="text-muted mb-0">${percentage}%</p>
                        <button class="btn btn-outline-${config.color} btn-sm mt-2"
                                onclick="filterContentTypeUsers('${type}')">
                            查看详情
                        </button>
                    </div>
                </div>
            </div>
        `;
        statsContainer.append(cardHtml);
    });
}

// 创建发言类型图表
function createContentTypeCharts() {
    createContentTypePieChart();
    createContentTypeBarChart();
}

// 创建发言类型饼图
function createContentTypePieChart() {
    const canvas = document.getElementById('contentTypeChart');
    if (!canvas) {
        console.error('找不到发言类型图表画布');
        return;
    }

    const ctx = canvas.getContext('2d');

    // 统计数据
    const contentTypeStats = {};
    analyticsData.users.forEach(user => {
        const contentType = user.dimensions?.content_type?.type || '未知';
        contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    });

    // 颜色配置
    const colors = [
        '#007bff', '#28a745', '#17a2b8', '#dc3545',
        '#ffc107', '#6c757d', '#20c997', '#6f42c1'
    ];

    const labels = Object.keys(contentTypeStats);
    const data = Object.values(contentTypeStats);

    // 销毁现有图表
    if (window.contentTypePieChart) {
        window.contentTypePieChart.destroy();
    }

    window.contentTypePieChart = new Chart(ctx, {
        type: 'pie',
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
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed}人 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 创建发言类型柱状图
function createContentTypeBarChart() {
    const canvas = document.getElementById('contentTypeBarChart');
    if (!canvas) {
        console.error('找不到发言类型柱状图画布');
        return;
    }

    const ctx = canvas.getContext('2d');

    // 统计数据
    const contentTypeStats = {};
    analyticsData.users.forEach(user => {
        const contentType = user.dimensions?.content_type?.type || '未知';
        contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    });

    // 按数量排序
    const sortedEntries = Object.entries(contentTypeStats).sort(([,a], [,b]) => b - a);
    const labels = sortedEntries.map(([type]) => type);
    const data = sortedEntries.map(([,count]) => count);

    // 销毁现有图表
    if (window.contentTypeBarChart) {
        window.contentTypeBarChart.destroy();
    }

    window.contentTypeBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '用户数量',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y}人`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// 初始化发言类型表格
function initializeContentTypeTable() {
    const users = analyticsData.users;

    // 桌面端表格数据
    const tableData = users.map(user => {
        const contentType = user.dimensions?.content_type || {};

        return [
            user.nickname,
            `<span class="badge bg-info">${contentType.type || '未知'}</span>`,
            user.message_count || 0,
            user.main_group || '未知群组',
            getContentTypeDescription(contentType.type),
            `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
        ];
    });

    // 初始化桌面端表格
    if ($('#contentTypeTable').length > 0) {
        // 销毁现有表格
        if ($.fn.DataTable.isDataTable('#contentTypeTable')) {
            $('#contentTypeTable').DataTable().destroy();
        }

        $('#contentTypeTable').DataTable({
            data: tableData,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
            },
            pageLength: 15,
            responsive: true,
            order: [[3, 'desc']], // 按消息数排序
            columnDefs: [
                { targets: -1, orderable: false, searchable: false }, // 最后一列（详情按钮）不可排序
                { targets: [2, 3], type: 'num' }
            ],
            searching: true, // 启用搜索框
            dom: 'frtip' // 标准布局：搜索框、表格、信息和分页
        });
    }

    // 生成移动端列表
    generateMobileContentTypeList(users);
}

// 生成移动端发言类型列表
function generateMobileContentTypeList(users) {
    const container = $('#contentTypeListMobile');
    container.empty();

    users.forEach(user => {
        const contentType = user.dimensions?.content_type || {};

        const itemHtml = `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="row align-items-center">
                        <div class="col-7">
                            <div class="fw-bold">${user.nickname}</div>
                            <div class="small text-muted">${user.main_group || '未知群组'}</div>
                            <span class="badge bg-info">${contentType.type || '未知'}</span>
                        </div>
                        <div class="col-3 text-center">
                            <div class="fw-bold text-primary">${user.message_count || 0}</div>
                            <div class="small text-muted">消息数</div>
                        </div>
                        <div class="col-2">
                            <button class="btn btn-primary btn-sm w-100" onclick="showUserDetail('${user.user_id}')">
                                详情
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(itemHtml);
    });
}

// 获取发言类型描述
function getContentTypeDescription(type) {
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

// 初始化发言类型筛选器
function initializeContentTypeFilter() {
    const filterSelect = $('#contentTypeFilter');

    // 获取所有类型
    const contentTypes = new Set();
    analyticsData.users.forEach(user => {
        const type = user.dimensions?.content_type?.type;
        if (type) contentTypes.add(type);
    });

    // 添加选项
    contentTypes.forEach(type => {
        filterSelect.append(`<option value="${type}">${type}</option>`);
    });

    // 绑定筛选事件
    filterSelect.on('change', function() {
        const selectedType = $(this).val();
        filterContentTypeUsers(selectedType);
    });
}

// 按类型筛选用户
function filterContentTypeUsers(type) {
    if (type) {
        // 显示分类用户模态框
        showCategoryUsersModal(type);
    } else {
        // 清除筛选（保留原有功能用于筛选器）
        const table = $('#contentTypeTable').DataTable();
        table.column(1).search('').draw();
        $('#contentTypeFilter').val('');

        // 更新移动端列表
        generateMobileContentTypeList(analyticsData.users);
    }
}

// 初始化导出功能
function initializeContentTypeExport() {
    $('#exportContentTypeData').on('click', function() {
        exportContentTypeData();
    });
}

// 导出发言类型数据
function exportContentTypeData() {
    if (!analyticsData) {
        alert('数据未加载完成');
        return;
    }

    // 准备导出数据
    const exportData = {
        总览: {
            总用户数: analyticsData.users.length,
            导出时间: new Date().toLocaleString(),
            数据说明: '用户发言类型分析结果'
        },
        类型统计: {},
        用户详情: []
    };

    // 统计各类型数量
    const contentTypeStats = {};
    analyticsData.users.forEach(user => {
        const type = user.dimensions?.content_type?.type || '未知';
        contentTypeStats[type] = (contentTypeStats[type] || 0) + 1;

        // 添加用户详情
        exportData.用户详情.push({
            用户昵称: user.nickname,
            发言类型: type,
            消息数量: user.message_count || 0,
            主要群组: user.main_group || '未知',
            类型描述: getContentTypeDescription(type)
        });
    });

    exportData.类型统计 = contentTypeStats;

    // 创建下载
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `发言类型分析_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    console.log('发言类型数据导出完成');
}

// ===== 分类用户模态框相关功能 =====

// 显示分类用户模态框
function showCategoryUsersModal(type) {
    if (!analyticsData || !analyticsData.users) {
        console.error('数据未加载，无法显示分类用户');
        return;
    }

    console.log('显示分类用户模态框:', type);

    // 筛选该分类的用户
    const categoryUsers = analyticsData.users.filter(user => {
        return user.dimensions?.content_type?.type === type;
    });

    // 设置模态框标题和用户数量
    $('#categoryUsersTitle').text(`${type} - 用户列表`);
    $('#categoryUserCount').text(`共${categoryUsers.length}位用户`);

    // 生成表格数据
    generateCategoryUsersTable(categoryUsers, type);

    // 生成移动端列表
    generateCategoryUsersMobileList(categoryUsers, type);

    // 绑定导出功能
    $('#exportCategoryUsers').off('click').on('click', function() {
        exportCategoryUsers(categoryUsers, type);
    });

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('categoryUsersModal'));
    modal.show();
}

// 生成分类用户表格
function generateCategoryUsersTable(users, type) {
    // 桌面端表格数据
    const tableData = users.map(user => {
        return [
            user.nickname,
            user.message_count || 0,
            user.main_group || '未知群组',
            getContentTypeDescription(type),
            `<button class="btn btn-primary btn-sm" onclick="showUserDetail('${user.user_id}')">查看详情</button>`
        ];
    });

    // 销毁现有表格
    if ($.fn.DataTable.isDataTable('#categoryUsersTable')) {
        $('#categoryUsersTable').DataTable().destroy();
    }

    // 初始化新表格
    $('#categoryUsersTable').DataTable({
        data: tableData,
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/zh.json'
        },
        pageLength: 10,
        responsive: true,
        order: [[1, 'desc']], // 按消息数排序
        columnDefs: [
            { targets: -1, orderable: false, searchable: false }, // 最后一列（详情按钮）不可排序
            { targets: [1], type: 'num' }
        ],
        searching: true, // 启用搜索
        dom: 'frtip' // 搜索框、表格、信息和分页
    });
}

// 生成分类用户移动端列表
function generateCategoryUsersMobileList(users, type) {
    const container = $('#categoryUsersListMobile');
    container.empty();

    if (users.length === 0) {
        container.append(`
            <div class="text-center py-4">
                <i class="fas fa-users text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">该分类暂无用户</p>
            </div>
        `);
        return;
    }

    users.forEach(user => {
        const itemHtml = `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="row align-items-center">
                        <div class="col-6">
                            <div class="fw-bold">${user.nickname}</div>
                            <div class="small text-muted">${user.main_group || '未知群组'}</div>
                            <span class="badge bg-info">${type}</span>
                        </div>
                        <div class="col-3 text-center">
                            <div class="fw-bold text-primary">${user.message_count || 0}</div>
                            <div class="small text-muted">消息数</div>
                        </div>
                        <div class="col-3">
                            <button class="btn btn-primary btn-sm w-100" onclick="showUserDetail('${user.user_id}')">
                                详情
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(itemHtml);
    });
}

// 导出分类用户数据
function exportCategoryUsers(users, type) {
    if (!users || users.length === 0) {
        alert('该分类暂无用户数据');
        return;
    }

    // 准备导出数据
    const exportData = {
        分类信息: {
            类型名称: type,
            类型描述: getContentTypeDescription(type),
            用户数量: users.length,
            导出时间: new Date().toLocaleString()
        },
        用户列表: users.map(user => ({
            用户昵称: user.nickname,
            消息数量: user.message_count || 0,
            主要群组: user.main_group || '未知',
            用户ID: user.user_id,
            平均消息长度: user.avg_message_length ? user.avg_message_length.toFixed(1) : 0,
            参与群组数: user.all_groups ? user.all_groups.length : 1
        }))
    };

    // 创建下载
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${type}_用户列表_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    console.log(`${type} 分类用户数据导出完成`);
}