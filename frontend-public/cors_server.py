#!/usr/bin/env python3
import http.server
import socketserver
from http import HTTPStatus

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # Allow embedding in iframes from localhost
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.OK)
        self.end_headers()

if __name__ == "__main__":
    port = 8080
    with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
        print(f"🚀 CORS-enabled server running at http://localhost:{port}")
        print("🔧 Iframe embedding enabled for admin panel")
        httpd.serve_forever()