#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器启动脚本
用于本地预览数据看板
"""

import http.server
import socketserver
import webbrowser
import os
import sys

def start_server(port=8080):
    """启动HTTP服务器"""
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"小小纺用户画像分析平台已启动")
            print(f"访问地址: http://localhost:{port}")
            print(f"服务目录: {os.getcwd()}")
            print(f"按 Ctrl+C 停止服务器\n")
            
            # 自动打开浏览器
            webbrowser.open(f'http://localhost:{port}')
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n服务器已停止")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"端口 {port} 已被占用，尝试端口 {port+1}")
            start_server(port+1)
        else:
            print(f"启动服务器失败: {e}")
            sys.exit(1)

if __name__ == "__main__":
    # 检查是否有数据文件
    if not os.path.exists("data/analytics.json"):
        print("数据文件不存在，请先运行 process_data.py 生成数据")
        response = input("是否现在运行数据处理脚本? (y/n): ")
        if response.lower() == 'y':
            os.system("python process_data.py")
        else:
            print("没有数据文件，无法启动服务器")
            sys.exit(1)
    
    print("检测到数据文件，启动服务器...")
    start_server()