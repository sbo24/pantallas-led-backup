#!/usr/bin/env python3
"""
Proxy Server para ShowsTrack
Redirige peticiones entre Vue y Pantallas Públicas
"""
import http.server
import socketserver
import urllib.request
import urllib.parse
from http import HTTPStatus

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    
    def do_GET(self):
        path = self.path
        
        # Ruteo basado en path
        if path.startswith('/public'):
            # Pantallas públicas - puerto 8080 interno
            target_url = f"http://localhost:8080{path.replace('/public', '', 1)}"
            self.proxy_request(target_url)
        elif path.startswith('/vue'):
            # Vue - puerto 3000 interno
            target_url = f"http://localhost:3000{path.replace('/vue', '', 1)}"
            self.proxy_request(target_url)
        else:
            # Por defecto: Vue
            target_url = f"http://localhost:3000{path}"
            self.proxy_request(target_url)
    
    def do_POST(self):
        # Mismo ruteo para POST
        self.do_GET()
    
    def proxy_request(self, target_url):
        try:
            # Hacer petición al servicio interno
            req = urllib.request.Request(target_url)
            
            # Copiar headers importantes
            for header in ['User-Agent', 'Accept', 'Content-Type']:
                if header in self.headers:
                    req.add_header(header, self.headers[header])
            
            response = urllib.request.urlopen(req)
            
            # Enviar respuesta
            self.send_response(HTTPStatus.OK)
            
            # Copiar headers de respuesta
            for header, value in response.headers.items():
                if header.lower() not in ['server', 'date']:
                    self.send_header(header, value)
            
            # Headers CORS
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            
            self.end_headers()
            
            # Enviar contenido
            self.wfile.write(response.read())
            
        except Exception as e:
            # Error de conexión
            self.send_response(HTTPStatus.BAD_GATEWAY)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            error_html = f"""
            <html>
                <body>
                    <h1>Servicio no disponible</h1>
                    <p>Error conectando a: {target_url}</p>
                    <p>Error: {str(e)}</p>
                    <hr>
                    <p><a href="/vue">Vue Development</a> | <a href="/public">Pantallas Públicas</a></p>
                </body>
            </html>
            """
            self.wfile.write(error_html.encode())

if __name__ == "__main__":
    PORT = 8081  # Puerto expuesto externamente
    
    with socketserver.TCPServer(("0.0.0.0", PORT), ProxyHandler) as httpd:
        print(f"🚀 ShowsTrack Proxy Server running on 0.0.0.0:{PORT}")
        print(f"🌐 Vue Development: http://172.26.131.240:{PORT}/vue")
        print(f"🎭 Pantallas Públicas: http://172.26.131.240:{PORT}/public")
        print(f"🔄 Default (Vue): http://172.26.131.240:{PORT}/")
        httpd.serve_forever()