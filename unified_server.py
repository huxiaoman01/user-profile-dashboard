#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一服务器管理脚本
用于启动所有必要的服务在单一端口上
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
from pathlib import Path

class UnifiedRequestHandler(http.server.SimpleHTTPRequestHandler):
    """统一的请求处理器，处理所有静态文件和API请求"""

    def do_GET(self):
        # 如果请求是根路径，返回index.html
        if self.path == '/':
            self.path = '/index.html'

        # 处理静态文件请求
        return super().do_GET()

    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def check_data_files():
    """检查必要的数据文件是否存在"""
    required_files = [
        "data/analytics_with_content_types.json",
        "index.html",
        "css/dashboard.css",
        "js/dashboard.js"
    ]

    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)

    if missing_files:
        print("缺少以下必要文件:")
        for file in missing_files:
            print(f"  - {file}")

        if "data/analytics_with_content_types.json" in missing_files:
            print("\n数据文件不存在，请先运行数据处理脚本生成数据")
            response = input("是否现在运行数据处理脚本? (y/n): ")
            if response.lower() == 'y':
                # 尝试运行可用的数据处理脚本
                scripts = ["process_data.py", "enhanced_data_processor.py", "fast_data_processor.py"]
                for script in scripts:
                    if os.path.exists(script):
                        print(f"运行 {script}...")
                        os.system(f"python {script}")
                        break
                else:
                    print("未找到数据处理脚本")
                    return False
            else:
                return False

    return True

def start_unified_server(port=8080, max_attempts=5):
    """启动统一服务器"""
    original_port = port

    # 检查数据文件
    if not check_data_files():
        print("启动失败：缺少必要文件")
        sys.exit(1)

    for attempt in range(max_attempts):
        try:
            with socketserver.TCPServer(("", port), UnifiedRequestHandler) as httpd:
                print("=" * 60)
                print("[启动] 小小纺用户画像分析平台统一服务器已启动")
                print("=" * 60)
                print(f"[访问] 访问地址: http://localhost:{port}")
                if port != original_port:
                    print(f"[注意] 原端口 {original_port} 被占用，已改用端口 {port}")
                print(f"[目录] 服务目录: {os.getcwd()}")
                print(f"[停止] 按 Ctrl+C 停止服务器")
                print("=" * 60)
                print("\n[功能] 可用功能:")
                print(f"  - 用户画像分析仪表板: http://localhost:{port}")
                print(f"  - 数据可视化图表: http://localhost:{port}/index.html")
                print(f"  - 内容类型分析: 已集成在主页面中")
                print(f"  - 时间习惯分析: 已集成在主页面中")
                print("\n[成功] 所有功能已统一到端口 {}\n".format(port))

                # 自动打开浏览器
                webbrowser.open(f'http://localhost:{port}')

                httpd.serve_forever()

        except KeyboardInterrupt:
            print("\n[停止] 服务器已停止")
            sys.exit(0)
        except OSError as e:
            if "Address already in use" in str(e):
                print(f"[错误] 端口 {port} 已被占用", end="")
                if attempt < max_attempts - 1:
                    port += 1
                    print(f"，尝试端口 {port}")
                else:
                    print(f"\n[错误] 已尝试 {max_attempts} 个端口都被占用")
                    print("[建议]:")
                    print("  1. 关闭其他占用端口的服务")
                    print("  2. 使用命令: netstat -ano | findstr :8080 查看占用进程")
                    print("  3. 使用 taskkill /PID <进程ID> /F 关闭进程")
                    sys.exit(1)
            else:
                print(f"[错误] 启动服务器失败: {e}")
                sys.exit(1)

def stop_conflicting_services():
    """停止可能冲突的服务"""
    import subprocess

    print("[检查] 检查并停止冲突的服务...")

    try:
        # 查找占用8080-8085端口的进程
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)
        lines = result.stdout.split('\n')

        pids_to_kill = set()
        for line in lines:
            if ':808' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) > 4:
                    pid = parts[-1]
                    if pid.isdigit():
                        pids_to_kill.add(pid)

        if pids_to_kill:
            print(f"[停止] 发现 {len(pids_to_kill)} 个占用端口的进程，正在停止...")
            for pid in pids_to_kill:
                try:
                    subprocess.run(['taskkill', '/PID', pid, '/F'], capture_output=True, shell=True)
                    print(f"[成功] 已停止进程 PID: {pid}")
                except:
                    pass
        else:
            print("[成功] 未发现端口冲突")

    except Exception as e:
        print(f"[警告] 无法自动停止冲突服务: {e}")
        print("请手动检查并停止占用端口的进程")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='小小纺用户画像分析平台统一服务器')
    parser.add_argument('--port', type=int, default=8080, help='服务器端口 (默认: 8080)')
    parser.add_argument('--stop-conflicts', action='store_true', help='自动停止冲突的服务')

    args = parser.parse_args()

    if args.stop_conflicts:
        stop_conflicting_services()

    print("[启动] 启动统一服务器...")
    start_unified_server(args.port)