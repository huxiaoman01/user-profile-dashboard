// 小小纺用户画像分析平台 - 图表配置

// Chart.js 全局配置
Chart.defaults.font.family = 'Microsoft YaHei, sans-serif';
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// 初始化所有图表
function initializeCharts() {
    if (!analyticsData) return;
    
    initializeNeedsChart();
    initializeGroupChart();
    initializeTrendChart();
    initializeHeatmapChart();
}

// 需求分析饼图
function initializeNeedsChart() {
    const ctx = document.getElementById('needsChart').getContext('2d');
    const needsData = analyticsData.needs_analysis;
    
    const labels = Object.keys(needsData);
    const data = Object.values(needsData);
    const backgroundColors = [
        '#007bff', '#28a745', '#17a2b8', 
        '#ffc107', '#dc3545', '#6610f2'
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// 群组分布柱状图
function initializeGroupChart() {
    const ctx = document.getElementById('groupChart').getContext('2d');
    const groupData = analyticsData.group_stats;
    
    const labels = Object.keys(groupData);
    const data = Object.values(groupData);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '用户数量',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.8)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 25,
                maxBarThickness: 35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `群组: ${context[0].label}`;
                        },
                        label: function(context) {
                            return `用户数量: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// 时间分布热力图（可扩展功能）
function initializeTimeHeatmap() {
    // 如果有时间数据，可以在这里实现热力图
    // 目前数据中没有详细的时间分析数据，先预留
}

// 用户活跃度趋势图（可扩展功能）
function initializeActivityTrend() {
    // 如果有活跃度数据，可以在这里实现趋势图
    // 目前数据中没有活跃度趋势数据，先预留
}

// 标签分布雷达图（可扩展功能）
function initializeTagRadar() {
    // 可以根据用户标签生成雷达图
    const ctx = document.getElementById('tagRadar');
    if (!ctx) return;
    
    // 统计各标签数量
    const tagCounts = {};
    analyticsData.users.forEach(user => {
        user.keywords.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    const labels = Object.keys(tagCounts);
    const data = Object.values(tagCounts);
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '用户标签分布',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(0, 123, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 123, 255, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 图表颜色生成器
function generateChartColors(count) {
    const baseColors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', 
        '#dc3545', '#6610f2', '#fd7e14', '#20c997'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
}

// 图表动画配置
const chartAnimationConfig = {
    duration: 1000,
    easing: 'easeInOutQuart'
};

// 时间趋势图
function initializeTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const trendData = analyticsData.time_trend;
    
    if (!trendData || !trendData.dates || trendData.dates.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="text-muted text-center">暂无时间趋势数据</p>';
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.dates,
            datasets: [{
                label: '每日消息数',
                data: trendData.message_counts,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                yAxisID: 'y'
            }, {
                label: '每日活跃用户数',
                data: trendData.active_users,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    },
                    ticks: {
                        maxRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '消息数'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '活跃用户数'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 需求热力图 - 使用HTML表格实现
function initializeHeatmapChart() {
    const container = document.getElementById('heatmapChart').parentElement;
    const heatmapData = analyticsData.heatmap_data;
    
    if (!heatmapData || !heatmapData.data || heatmapData.data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">暂无热力图数据</p>';
        return;
    }
    
    console.log('Heatmap data:', heatmapData); // 调试日志
    
    // 找到最大值用于颜色缩放
    const maxValue = Math.max(...heatmapData.data.flat());
    console.log('Max value:', maxValue); // 调试日志
    
    // 创建热力图HTML
    let heatmapHtml = `
        <div class="heatmap-container">
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th class="heatmap-label">需求类型</th>`;
    
    // 小时标题
    for (let hour = 0; hour < 24; hour += 2) {
        heatmapHtml += `<th class="heatmap-hour">${hour}:00</th>`;
    }
    heatmapHtml += `</tr></thead><tbody>`;
    
    // 数据行
    heatmapData.needs.forEach((need, needIndex) => {
        heatmapHtml += `<tr><td class="heatmap-label">${need}</td>`;
        
        for (let hour = 0; hour < 24; hour += 2) {
            const value = heatmapData.data[needIndex][hour] || 0;
            const intensity = maxValue > 0 ? value / maxValue : 0;
            const opacity = 0.1 + intensity * 0.9;
            const backgroundColor = value > 0 ? `rgba(255, 99, 132, ${opacity})` : 'rgba(240, 240, 240, 0.3)';
            
            heatmapHtml += `
                <td class="heatmap-cell" 
                    style="background-color: ${backgroundColor};"
                    title="${need} - ${hour}:00时: ${value}条需求">
                    ${value > 0 ? value : ''}
                </td>`;
        }
        heatmapHtml += `</tr>`;
    });
    
    heatmapHtml += `</tbody></table>
        <div class="heatmap-legend">
            <span class="legend-label">热度:</span>
            <div class="legend-gradient"></div>
            <div class="legend-labels">
                <span>低</span>
                <span>高</span>
            </div>
        </div>
    </div>`;
    
    container.innerHTML = heatmapHtml;
}

// 图表响应式配置
const chartResponsiveConfig = {
    responsive: true,
    maintainAspectRatio: false
};