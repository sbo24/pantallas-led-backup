#!/usr/bin/env python3
import http.server
import socketserver
from http import HTTPStatus

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # Allow embedding in iframes from localhost and external IP
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 http://172.26.131.240:3000")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.OK)
        self.end_headers()

if __name__ == "__main__":
    port = 8080
    with socketserver.TCPServer(("0.0.0.0", port), CORSHTTPRequestHandler) as httpd:
        print(f"🚀 CORS-enabled server running at http://0.0.0.0:{port}")
        print(f"🌐 Accessible at: http://localhost:{port} and http://172.26.131.240:{port}")
        print("🔧 Iframe embedding enabled for admin panel")
        httpd.serve_forever()